"use client";

import {
  forwardRef,
  startTransition,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { LoadingState } from "./loading-state";

type TransitionType = "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "scale";

/**
 * Handle for imperatively triggering animations on LoadingTransition.
 * Use with `useRef<LoadingTransitionHandle>(null)` and pass to `useUrlFilters`.
 */
export interface LoadingTransitionHandle {
  /** Triggers the content animation. Call when filters/search change. */
  triggerAnimation: () => void;
}

interface LoadingTransitionProps {
  /**
   * Whether to show the loading state.
   * Typically used with: `isLoading && data.length === 0`
   * This ensures loading only shows on initial load, not on subsequent fetches.
   * @default false
   */
  isLoading?: boolean;

  /**
   * Whether to show the loading indicator (spinner).
   * Set to `false` for local/static data where you only want the mount animation.
   * @default true
   */
  showLoadingIndicator?: boolean;

  /**
   * Message to display while loading.
   * @example "Loading users..."
   */
  loadingMessage?: string;

  /** The main content to render when not loading. */
  children: React.ReactNode;

  /**
   * Animation style for the transition.
   * @default "slide-down"
   */
  transition?: TransitionType;

  /**
   * Animation duration in milliseconds.
   * @default 250
   */
  duration?: number;

  /** Additional className for the container wrapper. */
  className?: string;

  /**
   * Whether to animate content on initial mount.
   * @default true
   */
  animateOnMount?: boolean;
}

const transitionStyles: Record<TransitionType, { enter: string; exit: string }> = {
  fade: {
    enter: "opacity-100",
    exit: "opacity-0",
  },
  "slide-up": {
    enter: "opacity-100 translate-y-0",
    exit: "opacity-0 translate-y-4",
  },
  "slide-down": {
    enter: "opacity-100 translate-y-0",
    exit: "opacity-0 -translate-y-4",
  },
  "slide-left": {
    enter: "opacity-100 translate-x-0",
    exit: "opacity-0 translate-x-4",
  },
  "slide-right": {
    enter: "opacity-100 translate-x-0",
    exit: "opacity-0 -translate-x-4",
  },
  scale: {
    enter: "opacity-100 scale-100",
    exit: "opacity-0 scale-95",
  },
};

/**
 * LoadingTransition - Smooth transitions between loading and loaded states.
 *
 * Displays a loading indicator while data is being fetched, then animates
 * the content into view. Supports imperative re-animation via ref (useful
 * for search/filter results).
 *
 * @example Basic usage with query loading
 * ```tsx
 * const { data = [], isLoading } = useQuery(...);
 *
 * <LoadingTransition
 *   isLoading={isLoading && data.length === 0}
 *   loadingMessage="Loading items..."
 * >
 *   <ItemList items={data} />
 * </LoadingTransition>
 * ```
 *
 * @example Animation only (no loading indicator) for local/static data
 * ```tsx
 * <LoadingTransition showLoadingIndicator={false}>
 *   <LocalContent />
 * </LoadingTransition>
 * ```
 *
 * @example With search/filter (imperative animation trigger)
 * ```tsx
 * const animationRef = useRef<LoadingTransitionHandle>(null);
 * const { state, actions } = useUrlFilters([], { animationRef });
 * const { data = [], isLoading } = useUsers(state);
 *
 * <LoadingTransition
 *   ref={animationRef}
 *   isLoading={isLoading && data.length === 0}
 *   loadingMessage="Loading users..."
 * >
 *   <UserList users={data} />
 * </LoadingTransition>
 * ```
 */
export const LoadingTransition = forwardRef<LoadingTransitionHandle, LoadingTransitionProps>(
  function LoadingTransition(
    {
      isLoading = false,
      showLoadingIndicator = true,
      loadingMessage,
      children,
      transition = "slide-down",
      duration = 250,
      className,
      animateOnMount = true,
    },
    ref,
  ) {
    const styles = transitionStyles[transition];
    const fadeStyle = transitionStyles.fade;

    // Animation key - incremented to trigger re-animation
    const [animationKey, setAnimationKey] = useState(0);

    // Expose triggerAnimation method via ref
    useImperativeHandle(ref, () => ({
      triggerAnimation: () => {
        setAnimationKey((k) => k + 1);
      },
    }));

    // Track mount state for proper SSR hydration
    // Initialize based on animateOnMount to avoid effect-based setState
    const [mounted, setMounted] = useState(!animateOnMount);
    const [hasAnimated, setHasAnimated] = useState(!animateOnMount);
    const frameRef = useRef<{ frame1?: number; frame2?: number }>({});

    useEffect(() => {
      if (!animateOnMount) {
        // Already initialized in useState
        return;
      }

      const frames = frameRef.current;

      // Two-frame approach for smooth animation after SSR
      frames.frame1 = requestAnimationFrame(() => {
        startTransition(() => setMounted(true));
        frames.frame2 = requestAnimationFrame(() => {
          startTransition(() => setHasAnimated(true));
        });
      });

      return () => {
        if (frames.frame1) cancelAnimationFrame(frames.frame1);
        if (frames.frame2) cancelAnimationFrame(frames.frame2);
      };
    }, [animateOnMount]);

    // Show content with enter animation when:
    // - Not loading AND mounted AND has animated
    const showContent = !isLoading && mounted && hasAnimated;

    return (
      <div className={cn("relative", className)}>
        {/* Loading State - only render if showLoadingIndicator is true */}
        {showLoadingIndicator && (
          <div
            className={cn(
              "transition-all",
              isLoading
                ? fadeStyle.enter
                : cn(fadeStyle.exit, "absolute inset-0 pointer-events-none"),
            )}
            style={{ transitionDuration: `${duration}ms` }}
          >
            <LoadingState message={loadingMessage} />
          </div>
        )}

        {/* Main Content - key prop forces remount when animationKey changes, triggering re-animation */}
        <AnimatedContent
          key={animationKey}
          show={showContent}
          styles={styles}
          duration={duration}
          animateOnMount={animateOnMount}
        >
          {children}
        </AnimatedContent>
      </div>
    );
  },
);

/**
 * Inner component that handles the enter animation.
 * Using a separate component allows us to use the key prop on it,
 * which forces remount and re-triggers the animation when animationKey changes.
 */
function AnimatedContent({
  show,
  styles,
  duration,
  animateOnMount,
  children,
}: {
  show: boolean;
  styles: { enter: string; exit: string };
  duration: number;
  animateOnMount: boolean;
  children: React.ReactNode;
}) {
  // Initialize based on animateOnMount to avoid effect-based setState
  const [mounted, setMounted] = useState(!animateOnMount);
  const [hasAnimated, setHasAnimated] = useState(!animateOnMount);
  const frameRef = useRef<{ frame1?: number; frame2?: number }>({});

  useEffect(() => {
    if (!animateOnMount) {
      // Already initialized in useState
      return;
    }

    const frames = frameRef.current;

    // Two-frame approach to ensure browser paints exit state before animating
    // Frame 1: Mark as mounted (still showing exit state)
    // Frame 2: Trigger animation to enter state
    frames.frame1 = requestAnimationFrame(() => {
      startTransition(() => setMounted(true));
      frames.frame2 = requestAnimationFrame(() => {
        startTransition(() => setHasAnimated(true));
      });
    });

    return () => {
      if (frames.frame1) cancelAnimationFrame(frames.frame1);
      if (frames.frame2) cancelAnimationFrame(frames.frame2);
    };
  }, [animateOnMount]);

  const showContent = show && mounted && hasAnimated;

  return (
    <div
      className={cn(
        "space-y-section transition-all",
        mounted ? (showContent ? styles.enter : styles.exit) : styles.exit,
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}
