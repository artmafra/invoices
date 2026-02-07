import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lazy-loaded Calendar component to reduce initial bundle size.
 * The react-day-picker library is ~40KB and only needed when date selection is required.
 */
export const LazyCalendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => ({ default: mod.Calendar })),
  {
    ssr: false,
    loading: () => (
      <div className="p-space-md">
        <Skeleton className="h-[280px] w-[280px]" />
      </div>
    ),
  },
);
