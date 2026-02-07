import { Bucket, Storage } from "@google-cloud/storage";
import sharp from "sharp";
import { imageUploadLimits } from "@/config/site.config";
import { ServiceUnavailableError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface UploadResult {
  url: string;
  fileName: string;
  originalName: string;
  contentType?: string;
}

interface ImageFile {
  name: string;
  url: string;
  size: number;
  updated: string;
  contentType: string;
}

interface ProfilePictureOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

const DEFAULT_PROFILE_OPTIONS: Required<ProfilePictureOptions> = {
  width: 300,
  height: 300,
  quality: 85,
  format: "webp",
};

/**
 * Profile picture sizes for responsive delivery.
 * - sm: Navigation avatars, small thumbnails (32-48px display)
 * - md: User cards, lists (64-96px display)
 * - lg: Profile headers, large displays (128-192px display)
 * - original: Full quality for zoom/download (300px)
 */
export const PROFILE_PICTURE_SIZES = {
  sm: { width: 64, height: 64, quality: 80 },
  md: { width: 128, height: 128, quality: 85 },
  lg: { width: 256, height: 256, quality: 90 },
} as const;

/**
 * Result of image dimension validation
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  code?: "IMAGE_TOO_LARGE" | "IMAGE_DIMENSIONS_EXCEEDED" | "IMAGE_INVALID";
}

export type ProfilePictureSize = keyof typeof PROFILE_PICTURE_SIZES;

export class CloudStorageService {
  private storage: Storage | null = null;
  private bucket: Bucket | null = null;
  private bucketName: string;

  private readonly allowedRasterFormats = {
    jpeg: { contentType: "image/jpeg", extension: "jpg" },
    png: { contentType: "image/png", extension: "png" },
    gif: { contentType: "image/gif", extension: "gif" },
    webp: { contentType: "image/webp", extension: "webp" },
  } as const;

  constructor() {
    this.bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "";

    if (this.isConfigured()) {
      this.storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS || "{}"),
      });
      this.bucket = this.storage.bucket(this.bucketName);
    }
  }

  /**
   * Check if Google Cloud Storage is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.GOOGLE_CLOUD_PROJECT_ID &&
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET &&
      process.env.GOOGLE_CLOUD_CREDENTIALS
    );
  }

  /**
   * Get profile picture options for a given size
   */
  getProfilePictureOptions(size: ProfilePictureSize = "lg") {
    return {
      ...PROFILE_PICTURE_SIZES[size],
      format: "webp" as const,
    };
  }

  /**
   * Validate image dimensions to prevent decompression bomb attacks
   * Returns validation result instead of throwing to avoid module boundary issues
   */
  async validateImageDimensions(file: Buffer): Promise<ImageValidationResult> {
    try {
      const metadata = await sharp(file, {
        limitInputPixels: imageUploadLimits.maxTotalPixels,
      }).metadata();

      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const totalPixels = width * height;

      if (
        width > imageUploadLimits.maxDimensionPixels ||
        height > imageUploadLimits.maxDimensionPixels
      ) {
        return {
          valid: false,
          error: `Image dimensions (${width}x${height}) exceed maximum allowed (${imageUploadLimits.maxDimensionPixels}px). Please resize and try again.`,
          code: "IMAGE_DIMENSIONS_EXCEEDED",
        };
      }

      if (totalPixels > imageUploadLimits.maxTotalPixels) {
        return {
          valid: false,
          error: `Image pixel count (${totalPixels.toLocaleString()}) exceeds maximum allowed (${imageUploadLimits.maxTotalPixels.toLocaleString()}). Please resize and try again.`,
          code: "IMAGE_TOO_LARGE",
        };
      }

      return { valid: true };
    } catch (error) {
      // Sharp throws when limitInputPixels is exceeded during decode
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("Input image exceeds pixel limit")) {
        return {
          valid: false,
          error: `Image is too large. Maximum allowed: ${imageUploadLimits.maxDimensionPixels}px per dimension or ${(imageUploadLimits.maxTotalPixels / 1_000_000).toFixed(0)}MP total. Please resize and try again.`,
          code: "IMAGE_TOO_LARGE",
        };
      }

      return {
        valid: false,
        error: `Invalid or corrupted image file. Maximum allowed: ${imageUploadLimits.maxDimensionPixels}px per dimension. Please try a different image.`,
        code: "IMAGE_INVALID",
      };
    }
  }

  /**
   * Upload an image to storage
   */
  async uploadImage(
    file: Buffer,
    filename: string,
    folder: string = "images",
  ): Promise<UploadResult> {
    if (!this.bucket) {
      throw new ServiceUnavailableError("Service temporarily unavailable. Please try again later.");
    }

    const detected = await this.detectRasterImageOrThrow(file);

    // Validate image dimensions to prevent decompression bomb attacks
    const validation = await this.validateImageDimensions(file);
    if (!validation.valid) {
      throw new ValidationError(validation.error);
    }

    const baseName = filename.replace(/\.[^.]+$/, "");
    // Clean filename: remove spaces, special characters, and ensure it's safe
    const cleanBaseNameRaw = baseName
      .replace(/[^a-zA-Z0-9.-]/g, "-")
      .replace(/--+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "");
    const cleanBaseName = cleanBaseNameRaw || "image";
    const cleanFilename = `${cleanBaseName}.${detected.extension}`;

    // Add timestamp prefix to avoid conflicts while keeping the custom name
    const finalFileName = `${folder}/${Date.now()}-${cleanFilename}`;
    const gcsFile = this.bucket.file(finalFileName);

    // Create a stream to upload the file
    const stream = gcsFile.createWriteStream({
      metadata: {
        contentType: detected.contentType,
        cacheControl: "public, max-age=31536000", // Cache for 1 year
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream.on("error", (error) => {
        reject(error);
      });

      stream.on("finish", async () => {
        try {
          resolve({
            url: this.getProxyUrl(finalFileName),
            fileName: finalFileName,
            originalName: filename,
            contentType: detected.contentType,
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.end(file);
    });
  }

  /**
   * Upload a profile picture with automatic resizing and optimization.
   * Generates multiple sizes (sm, md, lg) plus the original size for responsive delivery.
   * Returns the base URL - append _sm, _md, or _lg before extension for specific sizes.
   */
  async uploadProfilePicture(
    file: Buffer,
    userUuid: string,
    originalFileName: string,
    options: ProfilePictureOptions = {},
  ): Promise<UploadResult> {
    if (!this.bucket) {
      throw new ServiceUnavailableError("Service temporarily unavailable. Please try again later.");
    }

    // Merge options with defaults
    const processOptions = { ...DEFAULT_PROFILE_OPTIONS, ...options };

    // Reject SVG and non-image payloads regardless of client-provided MIME
    await this.detectRasterImageOrThrow(file);

    // Validate image dimensions to prevent decompression bomb attacks
    const validation = await this.validateImageDimensions(file);
    if (!validation.valid) {
      throw new ValidationError(validation.error);
    }

    // Delete existing profile pictures (all sizes) first
    await this.deleteExistingProfilePicture(userUuid);

    const format = processOptions.format;
    const basePath = `images/profile-pictures/${userUuid}`;

    // Create base sharp instance with security options
    const baseSharp = sharp(file, {
      limitInputPixels: imageUploadLimits.maxTotalPixels,
      sequentialRead: true,
      failOn: "truncated",
    });

    // Generate and upload all sizes in parallel
    const uploadPromises: Promise<void>[] = [];

    // Upload original/main size (300x300)
    const mainBuffer = await baseSharp
      .clone()
      .resize(processOptions.width, processOptions.height, {
        fit: "cover",
        position: "center",
      })
      .toFormat(format, {
        quality: processOptions.quality,
        progressive: true,
        mozjpeg: format === "jpeg",
      })
      .toBuffer();

    uploadPromises.push(
      this.uploadBuffer(mainBuffer, `${basePath}.${format}`, format, originalFileName),
    );

    // Upload responsive sizes
    for (const [sizeName, sizeOpts] of Object.entries(PROFILE_PICTURE_SIZES)) {
      const sizedBuffer = await baseSharp
        .clone()
        .resize(sizeOpts.width, sizeOpts.height, {
          fit: "cover",
          position: "center",
        })
        .toFormat(format, {
          quality: sizeOpts.quality,
          progressive: true,
          mozjpeg: format === "jpeg",
        })
        .toBuffer();

      uploadPromises.push(
        this.uploadBuffer(
          sizedBuffer,
          `${basePath}_${sizeName}.${format}`,
          format,
          originalFileName,
        ),
      );
    }

    await Promise.all(uploadPromises);

    // Add cache-busting timestamp to prevent browser from serving stale cached images
    const cacheBuster = Date.now();
    const mainPath = `${basePath}.${format}`;

    return {
      url: `${this.getProxyUrl(mainPath)}?v=${cacheBuster}`,
      fileName: mainPath,
      originalName: originalFileName,
      contentType: `image/${format}`,
    };
  }

  /**
   * Helper to upload a buffer to GCS
   */
  private async uploadBuffer(
    buffer: Buffer,
    fullPath: string,
    format: string,
    originalFileName: string,
  ): Promise<void> {
    if (!this.bucket) {
      throw new ServiceUnavailableError("Service temporarily unavailable. Please try again later.");
    }

    const gcsFile = this.bucket.file(fullPath);

    const stream = gcsFile.createWriteStream({
      metadata: {
        contentType: `image/${format}`,
        cacheControl: "public, max-age=604800, must-revalidate",
        metadata: {
          originalName: originalFileName,
          processedAt: new Date().toISOString(),
        },
      },
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream.on("error", reject);
      stream.on("finish", () => resolve());
      stream.end(buffer);
    });
  }

  /**
   * Delete existing profile picture for a user (all sizes)
   */
  async deleteExistingProfilePicture(userUuid: string): Promise<void> {
    if (!this.bucket) {
      return;
    }

    try {
      const possibleExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
      const sizeSuffixes = ["", "_sm", "_md", "_lg"]; // empty string for original

      for (const ext of possibleExtensions) {
        for (const suffix of sizeSuffixes) {
          const fileName = `images/profile-pictures/${userUuid}${suffix}.${ext}`;
          const file = this.bucket.file(fileName);

          try {
            const [exists] = await file.exists();
            if (exists) {
              await file.delete();
              logger.info({ userUuid, fileName }, "Deleted existing profile picture");
            }
          } catch {
            continue;
          }
        }
      }
    } catch (error) {
      logger.error({ error, userUuid }, "Error deleting existing profile picture");
    }
  }

  /**
   * Delete an image by its file path
   */
  async deleteImage(fileName: string): Promise<void> {
    if (!this.bucket) {
      throw new ServiceUnavailableError("Service temporarily unavailable. Please try again later.");
    }
    const file = this.bucket.file(fileName);
    await file.delete();
  }

  /**
   * Delete an image by its public URL
   */
  async deleteImageByUrl(imageUrl: string): Promise<boolean> {
    try {
      const objectKey = this.extractObjectKey(imageUrl);
      await this.deleteImage(objectKey);

      return true;
    } catch (error) {
      logger.error({ error, imageUrl }, "Error deleting image by URL");
      return false;
    }
  }

  /**
   * List images in a folder
   */
  async listImages(folder: string = "images"): Promise<ImageFile[]> {
    if (!this.bucket) {
      return [];
    }

    try {
      const [files] = await this.bucket.getFiles({
        prefix: folder + "/",
        delimiter: "/",
      });

      const imageFiles: ImageFile[] = [];

      for (const file of files) {
        const [metadata] = await file.getMetadata();

        if (metadata.contentType && metadata.contentType.startsWith("image/")) {
          imageFiles.push({
            name: file.name,
            url: this.getProxyUrl(file.name),
            size:
              typeof metadata.size === "number" ? metadata.size : parseInt(metadata.size || "0"),
            updated: metadata.updated || new Date().toISOString(),
            contentType: metadata.contentType,
          });
        }
      }

      return imageFiles.sort(
        (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
      );
    } catch (error) {
      logger.error({ error, folder }, "Error listing images");
      return [];
    }
  }

  /**
   * Test storage connection by uploading and deleting a test file
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.bucket) {
      return {
        success: false,
        message: "Google Cloud Storage is not configured. Please set environment variables.",
      };
    }

    try {
      const testFileName = `test-${Date.now()}.txt`;
      const testContent = "Storage connection test";
      const file = this.bucket.file(`test/${testFileName}`);

      // Upload test file
      await file.save(testContent, {
        metadata: { contentType: "text/plain" },
      });

      // Delete test file
      await file.delete();

      return {
        success: true,
        message: "Storage connection successful! Test file uploaded and deleted.",
      };
    } catch (error) {
      logger.error({ error }, "Storage test failed");
      return {
        success: false,
        message: error instanceof Error ? error.message : "Storage connection failed",
      };
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split(".").pop();
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      default:
        return "image/jpeg";
    }
  }

  private async detectRasterImageOrThrow(file: Buffer): Promise<{
    contentType: string;
    extension: string;
  }> {
    try {
      const metadata = await sharp(file, {
        limitInputPixels: imageUploadLimits.maxTotalPixels,
        sequentialRead: true,
        failOn: "truncated",
      }).metadata();

      // Sharp reports SVG as format "svg"; reject explicitly.
      if (metadata.format === "svg") {
        throw new ValidationError("SVG images are not allowed", "SVG_NOT_ALLOWED");
      }

      if (!metadata.format) {
        throw new ValidationError("Invalid or corrupted image file", "INVALID_IMAGE");
      }

      const allowed =
        this.allowedRasterFormats[metadata.format as keyof typeof this.allowedRasterFormats];
      if (!allowed) {
        throw new ValidationError("Unsupported image format", "UNSUPPORTED_IMAGE_FORMAT");
      }

      return {
        contentType: allowed.contentType,
        extension: allowed.extension,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError("Invalid or corrupted image file", "INVALID_IMAGE");
    }
  }

  getProxyUrl(objectKey: string): string {
    const encodedKey = objectKey
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `/api/storage/${encodedKey}`;
  }

  private extractObjectKey(input: string): string {
    // Accept:
    // - object key: images/...
    // - proxy URL: /api/storage/...
    // - GCS URL: https://storage.googleapis.com/<bucket>/...
    // - legacy URL containing bucket name
    const trimmed = input.trim();

    // Handle relative proxy URLs
    if (trimmed.startsWith("/api/storage/")) {
      const withoutQuery = trimmed.split("?")[0];
      return decodeURIComponent(withoutQuery.replace("/api/storage/", ""));
    }

    // Handle absolute URLs (proxy or storage.googleapis)
    try {
      const url = new URL(trimmed);
      if (url.pathname.startsWith("/api/storage/")) {
        return decodeURIComponent(url.pathname.replace("/api/storage/", ""));
      }

      if (url.hostname === "storage.googleapis.com") {
        const path = url.pathname.replace(/^\//, "");
        const parts = path.split("/");
        if (parts[0] === this.bucketName) {
          return decodeURIComponent(parts.slice(1).join("/"));
        }
      }
    } catch {
      // Not an absolute URL
    }

    // Legacy: try to locate the bucket name in a URL-like string
    const urlParts = trimmed.split("/");
    const bucketIndex = urlParts.indexOf(this.bucketName);
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      return decodeURIComponent(
        urlParts
          .slice(bucketIndex + 1)
          .join("/")
          .split("?")[0],
      );
    }

    // Fallback: treat as object key
    return decodeURIComponent(trimmed.split("?")[0]);
  }

  getGcsFile(objectKey: string) {
    if (!this.bucket) {
      throw new ServiceUnavailableError("Service temporarily unavailable. Please try again later.");
    }
    return this.bucket.file(objectKey);
  }
}
