/**
 * Storage Test Script
 *
 * Test Google Cloud Storage connection by uploading and deleting a test file.
 *
 * Usage:
 *   npm run test:storage
 *   npm run test:storage -- --json
 *
 * Options:
 *   --json    Output as JSON
 *   --help    Show usage information
 */

import "dotenv/config";
import { CloudStorageService } from "@/services/cloud-storage.service";
import { getBooleanArg, parseArgs, printUsage } from "../lib/args";

const OPTIONS = [
  { flag: "json", description: "Output as JSON" },
  { flag: "help", description: "Show usage information" },
];

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    bucket: string | null;
    projectId: string | null;
  };
  error?: string;
}

async function main() {
  const args = parseArgs();

  if (getBooleanArg(args, "help")) {
    printUsage("test:storage", OPTIONS);
    process.exit(0);
  }

  const jsonOutput = getBooleanArg(args, "json");

  const output = (result: TestResult) => {
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.success) {
        console.log(`\n✅ ${result.message}`);
        if (result.details) {
          console.log(`   Bucket: ${result.details.bucket}`);
          console.log(`   Project: ${result.details.projectId}`);
        }
      } else {
        console.error(`\n❌ ${result.message}`);
        if (result.error) {
          console.error(`   Error: ${result.error}`);
        }
      }
    }
  };

  const cloudStorage = new CloudStorageService();

  // Check if storage is configured
  if (!cloudStorage.isConfigured()) {
    output({
      success: false,
      message: "Google Cloud Storage is not configured",
      error:
        "Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_STORAGE_BUCKET, and GOOGLE_CLOUD_CREDENTIALS environment variables",
    });
    process.exit(1);
  }

  try {
    if (!jsonOutput) {
      console.log("\n🗄️  Testing Google Cloud Storage connection...");
    }

    const result = await cloudStorage.testConnection();

    if (result.success) {
      output({
        success: true,
        message: result.message,
        details: {
          bucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || null,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || null,
        },
      });
      process.exit(0);
    } else {
      output({
        success: false,
        message: "Storage connection test failed",
        error: result.message,
      });
      process.exit(1);
    }
  } catch (error) {
    output({
      success: false,
      message: "Storage connection test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();
