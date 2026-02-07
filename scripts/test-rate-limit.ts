#!/usr/bin/env npx tsx
/**
 * Rate Limit Test Script
 *
 * Tests the rate limiting functionality by sending multiple requests to auth endpoints.
 * Requires: Dev server running on localhost:3000 (or specify --url)
 *
 * Usage:
 *   npm run test:rate-limit                    # Test all endpoints
 *   npm run test:rate-limit -- --endpoint auth # Test specific endpoint
 *   npm run test:rate-limit -- --requests 10   # Custom request count
 *   npm run test:rate-limit -- --url http://localhost:3001  # Custom URL
 *
 * Endpoints:
 *   forgot        - /api/auth/forgot-password (3 req/min)
 *   reset         - /api/auth/reset-password (10 req/min)
 *   2fa           - /api/auth/2fa/resend (1 req/30s)
 *   invite        - /api/auth/invite (10 req/min)
 */
import { getBooleanArg, getStringArg, parseArgs } from "./lib/args";

const args = parseArgs();

// Configuration
const BASE_URL = getStringArg(args, "url") || "http://localhost:3000";
const ENDPOINT = getStringArg(args, "endpoint") || "all";
const REQUEST_COUNT = parseInt(getStringArg(args, "requests") || "10", 10);
const VERBOSE = getBooleanArg(args, "verbose") || false;

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

interface EndpointConfig {
  name: string;
  path: string;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
  expectedLimit: number;
  expectedWindow: string;
}

const endpoints: Record<string, EndpointConfig> = {
  forgot: {
    name: "Forgot Password",
    path: "/api/auth/forgot-password",
    method: "POST",
    body: { email: "test@example.com" },
    expectedLimit: 3,
    expectedWindow: "1 minute",
  },
  reset: {
    name: "Reset Password (GET)",
    path: "/api/auth/reset-password?token=test-token",
    method: "GET",
    expectedLimit: 10,
    expectedWindow: "1 minute",
  },
  "2fa": {
    name: "2FA Resend",
    path: "/api/auth/2fa/resend",
    method: "POST",
    body: { userId: "00000000-0000-0000-0000-000000000000" }, // Valid UUID format (non-existent user)
    expectedLimit: 1,
    expectedWindow: "30 seconds",
  },
  invite: {
    name: "Invite (GET)",
    path: "/api/auth/invite?token=test-token",
    method: "GET",
    expectedLimit: 10,
    expectedWindow: "1 minute",
  },
};

interface TestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  otherErrors: number;
  firstRateLimitAt: number | null;
  retryAfter: number | null;
}

async function testEndpoint(config: EndpointConfig): Promise<TestResult> {
  const result: TestResult = {
    endpoint: config.name,
    totalRequests: REQUEST_COUNT,
    successfulRequests: 0,
    rateLimitedRequests: 0,
    otherErrors: 0,
    firstRateLimitAt: null,
    retryAfter: null,
  };

  console.log(`\n${colors.cyan}Testing: ${config.name}${colors.reset}`);
  console.log(`${colors.dim}  Path: ${config.path}`);
  console.log(
    `  Expected limit: ${config.expectedLimit} requests per ${config.expectedWindow}${colors.reset}`,
  );
  console.log();

  for (let i = 1; i <= REQUEST_COUNT; i++) {
    try {
      const response = await fetch(`${BASE_URL}${config.path}`, {
        method: config.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      const status = response.status;
      const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
      const rateLimitLimit = response.headers.get("X-RateLimit-Limit");
      const retryAfter = response.headers.get("Retry-After");

      if (status === 429) {
        result.rateLimitedRequests++;
        if (result.firstRateLimitAt === null) {
          result.firstRateLimitAt = i;
          result.retryAfter = retryAfter ? parseInt(retryAfter, 10) : null;
        }

        if (VERBOSE) {
          console.log(
            `  ${colors.yellow}#${i}: 429 Rate Limited${colors.reset} (Retry-After: ${retryAfter}s)`,
          );
        } else {
          process.stdout.write(`${colors.yellow}×${colors.reset}`);
        }
      } else if (status >= 200 && status < 500) {
        // 2xx, 3xx, 4xx (except 429) are considered "successful" for rate limit testing
        // We expect 401, 400, etc. for invalid credentials/tokens
        result.successfulRequests++;

        if (VERBOSE) {
          console.log(
            `  ${colors.green}#${i}: ${status}${colors.reset}` +
              (rateLimitRemaining ? ` (Remaining: ${rateLimitRemaining}/${rateLimitLimit})` : ""),
          );
        } else {
          process.stdout.write(`${colors.green}✓${colors.reset}`);
        }
      } else {
        result.otherErrors++;
        if (VERBOSE) {
          console.log(`  ${colors.red}#${i}: ${status} Error${colors.reset}`);
        } else {
          process.stdout.write(`${colors.red}!${colors.reset}`);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      result.otherErrors++;
      if (VERBOSE) {
        console.log(`  ${colors.red}#${i}: Network Error${colors.reset}`);
      } else {
        process.stdout.write(`${colors.red}E${colors.reset}`);
      }
    }

    // Small delay between requests to avoid overwhelming
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (!VERBOSE) {
    console.log(); // New line after progress dots
  }

  return result;
}

function printResults(results: TestResult[]) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${colors.cyan}Rate Limit Test Results${colors.reset}`);
  console.log(`${"=".repeat(60)}\n`);

  let allPassed = true;

  for (const result of results) {
    const config = Object.values(endpoints).find((e) => e.name === result.endpoint)!;
    const rateLimitWorking =
      result.rateLimitedRequests > 0 || REQUEST_COUNT <= config.expectedLimit;

    if (!rateLimitWorking && result.otherErrors === 0) {
      allPassed = false;
    }

    console.log(`${colors.blue}${result.endpoint}${colors.reset}`);
    console.log(`  Requests sent:    ${result.totalRequests}`);
    console.log(`  Successful:       ${result.successfulRequests}`);
    console.log(
      `  Rate limited:     ${result.rateLimitedRequests}` +
        (result.firstRateLimitAt ? ` (first at request #${result.firstRateLimitAt})` : ""),
    );
    if (result.otherErrors > 0) {
      console.log(`  ${colors.red}Errors:           ${result.otherErrors}${colors.reset}`);
    }
    if (result.retryAfter) {
      console.log(`  Retry-After:      ${result.retryAfter}s`);
    }

    // Status
    if (result.otherErrors === result.totalRequests) {
      console.log(`  ${colors.red}Status: ⚠ Server unreachable or endpoint error${colors.reset}`);
    } else if (!rateLimitWorking) {
      console.log(
        `  ${colors.yellow}Status: ⚠ Rate limiting may not be configured (Redis not set up?)${colors.reset}`,
      );
    } else if (result.rateLimitedRequests > 0) {
      console.log(`  ${colors.green}Status: ✓ Rate limiting is working${colors.reset}`);
    } else {
      console.log(
        `  ${colors.green}Status: ✓ Under limit (${REQUEST_COUNT} ≤ ${config.expectedLimit})${colors.reset}`,
      );
    }
    console.log();
  }

  console.log(`${"=".repeat(60)}`);
  if (allPassed) {
    console.log(
      `${colors.green}All endpoints have rate limiting configured correctly.${colors.reset}`,
    );
  } else {
    console.log(
      `${colors.yellow}Some endpoints may not have rate limiting enabled.${colors.reset}`,
    );
    console.log(`${colors.dim}Make sure REDIS_URL is set.${colors.reset}`);
  }
  console.log();
}

async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     Rate Limit Testing Utility         ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
  console.log();
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Requests per endpoint: ${REQUEST_COUNT}`);
  console.log(`Verbose: ${VERBOSE}`);

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/api/health`, { method: "GET" }).catch(() => {
      // Try the base URL if health endpoint doesn't exist
      return fetch(BASE_URL);
    });
  } catch {
    console.error(`\n${colors.red}Error: Cannot connect to ${BASE_URL}${colors.reset}`);
    console.error(`Make sure the development server is running (npm run dev)`);
    process.exit(1);
  }

  const results: TestResult[] = [];

  if (ENDPOINT === "all") {
    for (const config of Object.values(endpoints)) {
      results.push(await testEndpoint(config));
    }
  } else if (endpoints[ENDPOINT]) {
    results.push(await testEndpoint(endpoints[ENDPOINT]));
  } else {
    console.error(`\n${colors.red}Unknown endpoint: ${ENDPOINT}${colors.reset}`);
    console.error(`Available: ${Object.keys(endpoints).join(", ")}`);
    process.exit(1);
  }

  printResults(results);
}

main().catch(console.error);
