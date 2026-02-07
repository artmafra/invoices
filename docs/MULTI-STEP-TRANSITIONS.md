# Multi-Step Transitions

`MultiStepContainer` provides a standard pattern for animated, multi-step UI flows (login, reset password, modals, wizards).

## Overview

- Steps register in render order to establish a navigation sequence.
- Direction (forward/backward) is inferred from step order.
- Initial render skips animation to avoid jank.

## Basic usage

```tsx
import { MultiStepContainer } from "@/components/ui/multi-step-container";

type Step = "step1" | "step2" | "step3";
const [step, setStep] = useState<Step>("step1");

<MultiStepContainer currentStep={step} onStepChange={setStep}>
  <MultiStepContainer.Step name="step1">...</MultiStepContainer.Step>
  <MultiStepContainer.Step name="step2">...</MultiStepContainer.Step>
  <MultiStepContainer.Step name="step3">...</MultiStepContainer.Step>
</MultiStepContainer>;
```

## Step behavior

- Only the active step is rendered.
- Default animation: `animate-in fade-in-0` plus slide direction.
- Use `animationClassName` to override the animation.
- Use `noWrapper` when you want `display: contents` (no animation wrapper).

## useMultiStep hook

```tsx
import { useMultiStep } from "@/components/ui/multi-step-container";

function Child() {
  const { goToStep, reset } = useMultiStep();
  return <Button onClick={() => goToStep("step2")}>Next</Button>;
}
```

## Example flow

Login view (simplified):

```
login -> forgot-password -> forgot-password-sent -> two-factor
```

## Files using this pattern

- `src/app/admin/login/page.tsx`
- `src/app/admin/reset-password/page.tsx`
- `src/components/admin/change-email-modal.tsx`
- `src/components/admin/2fa/totp-setup-modal.tsx`
- `src/components/admin/activity/verify-integrity-dialog.tsx`
- `src/components/shared/step-up-auth-dialog.tsx`
- `src/components/public/two-factor-method-selection.tsx`
