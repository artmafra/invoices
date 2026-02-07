import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lazy-loaded ReactMarkdown component to reduce initial bundle size.
 * The react-markdown library with rehype plugins is ~80KB+ and only needed for note rendering.
 */
export const LazyMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
  loading: () => (
    <div className="space-y-space-sm">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  ),
});
