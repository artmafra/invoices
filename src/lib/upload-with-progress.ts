/**
 * Upload a file with progress tracking using XMLHttpRequest.
 * Provides progress updates via callback.
 *
 * @param url - The upload endpoint URL
 * @param file - The file to upload
 * @param onProgress - Callback for progress updates (0-100)
 * @param options - Additional fetch-like options
 * @returns Promise resolving to the response data
 *
 * @example
 * ```ts
 * const result = await uploadWithProgress(
 *   '/api/upload',
 *   file,
 *   (progress) => setUploadProgress(progress),
 *   {
 *     headers: { 'X-Custom-Header': 'value' },
 *     body: { metadata: 'additional data' }
 *   }
 * );
 * ```
 */
export function uploadWithProgress<T = unknown>(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
  options?: {
    headers?: HeadersInit;
    body?: Record<string, unknown>;
    method?: string;
  },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(Math.round(percentComplete));
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          onProgress(100);
          resolve(data as T);
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    // Prepare form data
    const formData = new FormData();
    formData.append("file", file);

    // Add additional body fields if provided
    if (options?.body) {
      Object.entries(options.body).forEach(([key, value]) => {
        formData.append(key, JSON.stringify(value));
      });
    }

    // Open and configure request
    xhr.open(options?.method || "POST", url);

    // Set headers (excluding Content-Type, FormData sets it automatically)
    if (options?.headers) {
      const headers = new Headers(options.headers);
      headers.forEach((value, key) => {
        if (key.toLowerCase() !== "content-type") {
          xhr.setRequestHeader(key, value);
        }
      });
    }

    // Send request
    xhr.send(formData);
  });
}

/**
 * Hook wrapper for uploadWithProgress to use with React Query mutations.
 *
 * @example
 * ```tsx
 * const [progress, setProgress] = useState(0);
 *
 * const uploadMutation = useMutation({
 *   mutationFn: async (file: File) => {
 *     return uploadWithProgress<{ imageUrl: string }>(
 *       '/api/upload',
 *       file,
 *       setProgress
 *     );
 *   },
 *   onSuccess: () => setProgress(0),
 *   onError: () => setProgress(0),
 * });
 * ```
 */
export type UploadWithProgressFn = typeof uploadWithProgress;
