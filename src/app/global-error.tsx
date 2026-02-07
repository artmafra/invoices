"use client";

import NextError from "next/error";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  // Log error to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("Global error:", error);
  }

  // Detect database/connection errors
  const isDatabaseError =
    error.message?.toLowerCase().includes("database") ||
    error.message?.toLowerCase().includes("connection") ||
    error.message?.toLowerCase().includes("postgres") ||
    error.message?.toLowerCase().includes("redis") ||
    error.cause?.toString().toLowerCase().includes("econnrefused") ||
    error.cause?.toString().toLowerCase().includes("etimedout");

  return (
    <html>
      <body>
        {isDatabaseError ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100vh",
              padding: "2rem",
              fontFamily: "system-ui, sans-serif",
              backgroundColor: "#fafafa",
            }}
          >
            <div
              style={{
                maxWidth: "600px",
                textAlign: "center",
                backgroundColor: "white",
                padding: "3rem",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h1 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#ef4444" }}>
                Service Temporarily Unavailable
              </h1>
              <p style={{ fontSize: "1.125rem", color: "#64748b", marginBottom: "1.5rem" }}>
                We're experiencing database connectivity issues. The application is attempting to
                reconnect.
              </p>
              <p style={{ fontSize: "1rem", color: "#94a3b8" }}>
                Please try refreshing the page in a few moments. If the problem persists, contact
                support.
              </p>
              {process.env.NODE_ENV === "development" && (
                <details
                  style={{
                    marginTop: "2rem",
                    textAlign: "left",
                    padding: "1rem",
                    backgroundColor: "#f1f5f9",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                  }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: "500" }}>
                    Error Details (Development Only)
                  </summary>
                  <pre
                    style={{
                      marginTop: "1rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "#475569",
                    }}
                  >
                    {error.message}
                    {error.cause ? `\\n\\nCause: ${String(error.cause)}` : ""}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ) : (
          /* `NextError` is the default Next.js error page component. Its type
          definition requires a `statusCode` prop. However, since the App Router
          does not expose status codes for errors, we simply pass 0 to render a
          generic error message. */
          <NextError statusCode={0} />
        )}
      </body>
    </html>
  );
}
