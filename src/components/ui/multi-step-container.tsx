"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type Direction = "forward" | "backward" | "none";

interface MultiStepContextValue<TStep extends string = string> {
  /** Current active step */
  currentStep: TStep;
  /** Navigation direction for animation */
  direction: Direction;
  /** Whether user has navigated at least once (to skip initial animation) */
  hasNavigated: boolean;
  /** Navigate to a specific step */
  goToStep: (step: TStep) => void;
  /** Register a step (order determined by render order) */
  registerStep: (step: TStep) => void;
  /** Reset to initial state */
  reset: () => void;
}

interface MultiStepContainerProps<TStep extends string> {
  /** Current step (controlled) */
  currentStep: TStep;
  /** Callback when step changes */
  onStepChange?: (step: TStep) => void;
  /** Children (should be MultiStepContainer.Step components) */
  children: ReactNode;
  /** Additional class name for the container */
  className?: string;
}

interface MultiStepStepProps<TStep extends string = string> {
  /** Unique step identifier */
  name: TStep;
  /** Step content */
  children: ReactNode;
  /** Additional class name */
  className?: string;
  /** Custom animation classes (overrides default) */
  animationClassName?: string;
  /**
   * If true, uses display:contents (no animation, preserves parent layout).
   * If false (default), wraps in a div that can be animated.
   * Set to true when you want to animate only inner content manually.
   */
  noWrapper?: boolean;
}

// ============================================================================
// Context
// ============================================================================

const MultiStepContext = createContext<MultiStepContextValue | null>(null);

/**
 * Hook to access multi-step context from child components.
 * Provides current step, direction, and navigation functions.
 */
export function useMultiStep<TStep extends string = string>() {
  const context = useContext(MultiStepContext);
  if (!context) {
    throw new Error("useMultiStep must be used within a MultiStepContainer");
  }
  return context as unknown as MultiStepContextValue<TStep>;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Container for multi-step content with animated transitions.
 * Works with both Dialog and Card layouts.
 *
 * @example
 * ```tsx
 * const [step, setStep] = useState<"info" | "confirm">("info");
 *
 * <MultiStepContainer currentStep={step} onStepChange={setStep}>
 *   <MultiStepContainer.Step name="info">
 *     <InfoContent />
 *   </MultiStepContainer.Step>
 *   <MultiStepContainer.Step name="confirm">
 *     <ConfirmContent />
 *   </MultiStepContainer.Step>
 * </MultiStepContainer>
 * ```
 */
function MultiStepContainerRoot<TStep extends string>({
  currentStep,
  onStepChange,
  children,
  className,
}: MultiStepContainerProps<TStep>) {
  const [direction, setDirection] = useState<Direction>("none");
  const [hasNavigated, setHasNavigated] = useState(false);
  const stepOrderRef = useRef<Map<TStep, number>>(new Map());
  const stepCounterRef = useRef(0);
  const previousStepRef = useRef<TStep>(currentStep);
  const initialStepRef = useRef(currentStep);

  // Track direction when currentStep changes (supports both goToStep and direct prop changes)
  useEffect(() => {
    const prevStep = previousStepRef.current;
    if (currentStep !== prevStep && stepOrderRef.current.size > 0) {
      const prevIndex = stepOrderRef.current.get(prevStep) ?? 0;
      const currentIndex = stepOrderRef.current.get(currentStep) ?? 0;
      const newDirection = currentIndex > prevIndex ? "forward" : "backward";

      startTransition(() => {
        setDirection(newDirection);
        if (!hasNavigated) {
          setHasNavigated(true);
        }
      });
      previousStepRef.current = currentStep;
    }
  }, [currentStep, hasNavigated]);

  // Register steps in render order using incrementing counter
  const registerStep = useCallback((step: TStep) => {
    if (!stepOrderRef.current.has(step)) {
      stepOrderRef.current.set(step, stepCounterRef.current++);
    }
  }, []);

  const goToStep = useCallback(
    (newStep: TStep) => {
      if (newStep === currentStep) return;
      onStepChange?.(newStep);
    },
    [currentStep, onStepChange],
  );

  const reset = useCallback(() => {
    setDirection("none");
    setHasNavigated(false);
    previousStepRef.current = initialStepRef.current;
    onStepChange?.(initialStepRef.current);
  }, [onStepChange]);

  const contextValue = useMemo<MultiStepContextValue<TStep>>(
    () => ({
      currentStep,
      direction,
      hasNavigated,
      goToStep,
      registerStep,
      reset,
    }),
    [currentStep, direction, hasNavigated, goToStep, registerStep, reset],
  );

  return (
    <MultiStepContext.Provider value={contextValue as unknown as MultiStepContextValue}>
      {/* Using display:contents so this doesn't break parent grid/flex layouts */}
      <div className={cn("contents", className)}>{children}</div>
    </MultiStepContext.Provider>
  );
}

/**
 * Individual step content wrapper.
 * Only renders when this step is active.
 * Uses display:contents by default to not break parent grid/flex layouts.
 * Animation is applied to an inner wrapper if enabled.
 */
function MultiStepStep<TStep extends string>({
  name,
  children,
  className,
  animationClassName,
  noWrapper = false,
}: MultiStepStepProps<TStep> & { noWrapper?: boolean }) {
  const { currentStep, direction, hasNavigated, registerStep } = useMultiStep<TStep>();
  const registeredRef = useRef<true | null>(null);

  // Register step on first render (order determined by render order)
  // Use null check pattern which is allowed by the linter
  if (registeredRef.current == null) {
    registeredRef.current = true;
    registerStep(name);
  }

  if (currentStep !== name) {
    return null;
  }

  // Determine animation classes
  const getAnimationClasses = () => {
    if (!hasNavigated || noWrapper) {
      return ""; // No animation on initial render or when using contents mode
    }

    if (animationClassName) {
      return animationClassName;
    }

    const baseAnimation = "animate-in fade-in-0 duration-200";
    const slideDirection =
      direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4";

    return `${baseAnimation} ${slideDirection}`;
  };

  const animationClasses = getAnimationClasses();

  // If noWrapper, use contents to preserve parent grid layout (no animation)
  if (noWrapper) {
    return <div className={cn("contents", className)}>{children}</div>;
  }

  // With animation wrapper - replicates Dialog's gap-space-lg with flex column
  // overflow-hidden prevents horizontal scrollbar during slide animations
  return <div className={cn("flex flex-col", animationClasses, className)}>{children}</div>;
}

// ============================================================================
// Compound Component Export
// ============================================================================

export const MultiStepContainer = Object.assign(MultiStepContainerRoot, {
  Step: MultiStepStep,
});

// Re-export types for consumers
export type { MultiStepContainerProps, MultiStepStepProps, Direction };
