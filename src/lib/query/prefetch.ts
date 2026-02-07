import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

/**
 * Prefetch a single query in RSC and hydrate React Query cache on client
 */
export async function prefetchQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
  });

  return dehydrate(queryClient);
}

/**
 * Prefetch multiple queries in RSC and hydrate React Query cache on client
 */
export async function prefetchQueries(
  queries: Array<{
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
  }>,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });

  await Promise.all(
    queries.map((query) =>
      queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
      }),
    ),
  );

  return dehydrate(queryClient);
}

export { HydrationBoundary };
