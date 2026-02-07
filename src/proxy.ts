import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// ============================================================================
// Security Headers
// ============================================================================

/**
 * Generate a cryptographically secure nonce for CSP.
 * Used to allow specific inline scripts/styles while blocking others.
 */
function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Build Content Security Policy with nonce support.
 * In development, 'unsafe-eval' is needed for React Fast Refresh.
 */
function buildCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  // In dev mode, we need 'unsafe-eval' for React Fast Refresh/HMR
  // 'strict-dynamic' allows scripts loaded by trusted scripts to execute
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://accounts.google.com`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com`;

  // For styles, 'unsafe-inline' is acceptable as CSS cannot execute code
  // Many React components use inline styles via the style prop
  const styleSrc = `'self' 'unsafe-inline'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob: https://storage.googleapis.com https://lh3.googleusercontent.com",
    "font-src 'self'",
    "connect-src 'self' https://accounts.google.com https://www.googleapis.com",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const STATIC_SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  // Set static headers
  for (const [key, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Set nonce header for Server Components to read
  response.headers.set("x-nonce", nonce);

  // Set dynamic CSP with nonce
  response.headers.set("Content-Security-Policy", buildCSP(nonce));

  return response;
}

// ============================================================================
// Route Configuration
// ============================================================================

/**
 * Routes that don't require authentication.
 * - Exact matches: pathname === route
 * - Prefix matches: pathname.startsWith(route) when route ends with /
 */
const PUBLIC_ROUTES = [
  "/", // Landing page
  "/admin/login", // Login page
  "/auth/", // Auth-related pages (invite, error, etc.)
  "/api/auth/", // Public auth APIs (verify-credentials, forgot-password, etc.)
] as const;

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route.endsWith("/") ? pathname.startsWith(route) : pathname === route,
  );
}

// ============================================================================
// Proxy Handler
// ============================================================================

export default async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Generate a unique nonce for this request
  const nonce = generateNonce();

  // Public routes: no auth required
  if (isPublicRoute(pathname)) {
    return withSecurityHeaders(NextResponse.next(), nonce);
  }

  // Check for valid session
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

  // No token: redirect to login
  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    return withSecurityHeaders(NextResponse.redirect(loginUrl), nonce);
  }

  // Admin routes: verify user has at least one permission
  if (pathname.startsWith("/admin")) {
    const permissions = token.permissions as string[] | undefined;
    if (!permissions || permissions.length === 0) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return withSecurityHeaders(NextResponse.redirect(loginUrl), nonce);
    }
  }

  // Authenticated request: proceed
  return withSecurityHeaders(NextResponse.next(), nonce);
}

// ============================================================================
// Matcher Configuration
// ============================================================================

export const config = {
  /**
   * Match all paths except static assets:
   * - _next/static (static files)
   * - _next/image (image optimization)
   * - favicon.ico, images (public assets)
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
