"use client";

// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: unknown) => {
              // Don't retry on 4xx errors except 408, 429
              const apiError = error as { status?: number };
              if (
                apiError?.status &&
                apiError.status >= 400 &&
                apiError.status < 500 &&
                ![408, 429].includes(apiError.status)
              ) {
                return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
          },
          mutations: {
            retry: (failureCount, error: unknown) => {
              // Don't retry mutations on 4xx errors
              const apiError = error as { status?: number };
              if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
                return false;
              }
              // Retry up to 1 time for other errors
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools position="left" initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
