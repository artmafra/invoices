# Zod Validation & Translation Patterns

## Overview

This document outlines how Zod validation messages are handled with translations in this Next.js 16 project. The project uses a **dual-layer approach**: error codes in validation schemas and translation function calls on the client side.

---

## Key Findings & Patterns

### 1. **Error Code-Based Validation (Preferred Pattern)**

The most sophisticated pattern uses **translation keys instead of hardcoded messages** in validation logic. This separates concerns and makes translations composable.

**Example: Password Policy Validation**

- File: [src/lib/password-policy.ts](src/lib/password-policy.ts)
- Returns validation error objects with translation keys and parameters

```typescript
export interface PasswordValidationError {
  key: string;
  params?: Record<string, string | number | Date>;
}

export function validatePassword(
  password: string,
  settings: PasswordPolicySettings,
): PasswordValidationResult {
  const errors: PasswordValidationError[] = [];

  if (password.length < settings.minLength) {
    errors.push({
      key: "validation.passwordMinLength",
      params: { min: settings.minLength },
    });
  }

  if (settings.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({ key: "validation.passwordRequireUppercase" });
  }

  // ... more validations

  return { valid: errors.length === 0, errors, strength };
}
```

**Related Files:**

- [src/hooks/public/use-password-policy.ts](src/hooks/public/use-password-policy.ts) - Hook that translates error keys to strings
- [src/locales/en-US/errors.json](src/locales/en-US/errors.json) - Translation strings with parameters

---

### 2. **Translation Hook for Validation Results**

The `usePasswordValidation` hook demonstrates how to translate validation error keys at the client level:

**File:** [src/hooks/public/use-password-policy.ts](src/hooks/public/use-password-policy.ts)

```typescript
export const usePasswordValidation = (
  password: string,
): TranslatedPasswordValidationResult | null => {
  const { data: policy } = usePasswordPolicy();
  const t = useTranslations("errors");

  return useMemo(() => {
    if (!password) return null;

    const settings = policy ?? DEFAULT_PASSWORD_POLICY;
    const result = validatePassword(password, settings); // Returns error keys

    // Translate error keys to localized strings
    return {
      valid: result.valid,
      errors: translateErrors(result.errors, t), // ✓ Translation happens here
      strength: result.strength,
    };
  }, [password, policy, t]);
};

// Helper that converts error keys to translated strings
function translateErrors(
  errors: PasswordValidationError[],
  t: ReturnType<typeof useTranslations>,
): string[] {
  return errors.map((error) => t(error.key, error.params));
}
```

---

### 3. **Client-Side Use in Forms**

Forms use the translated validation results to display user-friendly error messages:

**File:** [src/components/admin/change-password-modal.tsx](src/components/admin/change-password-modal.tsx)

```typescript
"use client";

import { useTranslations } from "next-intl";
import { usePasswordValidation } from "@/hooks/public/use-password-policy";

export function ChangePasswordModal({ isOpen, onClose }: Props) {
  const t = useTranslations("profile.changePassword");
  const tCommon = useTranslations("common.buttons");

  // Dynamic translation in Zod schema (runtime translation)
  const changePasswordFormSchema = updatePasswordSchema
    .extend({
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("errors.mismatch"), // ✓ Translation injected at runtime
      path: ["confirmPassword"],
    });

  const newPassword = form.watch("newPassword");
  const passwordValidation = usePasswordValidation(newPassword);

  const handlePasswordSubmit = async (data: ChangePasswordFormValues) => {
    // Check validation result
    if (passwordValidation && !passwordValidation.valid) {
      form.setError("newPassword", {
        type: "manual",
        message: passwordValidation.errors[0] || t("errors.mismatch"),
      });
      return;
    }

    // ... proceed with submission
  };

  return (
    <FormField
      control={form.control}
      name="newPassword"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("newPassword")}</FormLabel>
          <FormControl>
            <Input {...field} type="password" />
          </FormControl>
          {/* Display translated validation errors */}
          <PasswordStrengthIndicator validation={passwordValidation} />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

**File:** [src/components/shared/password-strength-indicator.tsx](src/components/shared/password-strength-indicator.tsx)

```typescript
export function PasswordStrengthIndicator({
  validation,
  showErrors = true,
}: PasswordStrengthIndicatorProps) {
  const t = useTranslations("errors");

  if (!validation) return null;

  const { strength, errors } = validation;
  const strengthLabelKey = getStrengthLabelKey(strength);
  const strengthLabel = t(strengthLabelKey); // ✓ Translate strength label

  return (
    <div className={cn("space-y-space-sm", className)}>
      {/* Strength meter */}
      <div className="space-y-space-xs">
        <span>{strengthLabel}</span>
        {/* ... meter visualization */}
      </div>

      {/* Display translated validation errors */}
      {showErrors && errors.length > 0 && (
        <ul className="space-y-space-xs">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start gap-space-sm text-xs text-destructive">
              <span>•</span>
              <span>{error}</span> {/* Already translated by hook */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

### 4. **Hardcoded Messages Pattern (Current for Suppliers)**

Currently, the supplier and invoice forms use **hardcoded English messages** directly in Zod schemas. While this works, it's not localized.

**File:** [src/validations/supplier.validations.ts](src/validations/supplier.validations.ts)

```typescript
const cnpjValidation = z
  .string()
  .trim()
  .regex(/^\d{14}$/, "CNPJ must contain exactly 14 digits"); // ❌ Hardcoded English

const nameValidation = z
  .string()
  .trim()
  .min(1, "Name is required") // ❌ Hardcoded English
  .max(200);

export const createSupplierSchema = z.object({
  cnpj: cnpjValidation,
  name: nameValidation,
  city: cityValidation,
  taxRegime: supplierTaxRegimeSchema,
  obs: z.string().optional(),
});
```

**File:** [src/components/admin/suppliers/supplier-form-dialog.tsx](src/components/admin/suppliers/supplier-form-dialog.tsx)

```typescript
const form = useForm<SupplierFormValues>({
  resolver: zodResolver(createSupplierSchema),
  mode: "onChange",
  // ... defaults
});

// Error messages from Zod come through as-is (hardcoded English)
<FormFieldWithTooltip
  label={t("fields.cnpj")}
  error={fieldState.error?.message} // Gets hardcoded English message from Zod
  isTouched={!!form.formState.touchedFields.cnpj}
  isSubmitted={isSubmitted}
>
  <Input {...field} placeholder={t("fields.cnpjPlaceholder")} />
</FormFieldWithTooltip>
```

---

### 5. **Server-Side Validation Handling**

Server endpoints use `fromZodError` helper to convert Zod validation errors to API responses:

**File:** [src/app/api/admin/invoices/suppliers/route.ts](src/app/api/admin/invoices/suppliers/route.ts)

```typescript
import { fromZodError, ValidationError } from "@/lib/errors";
import { createSupplierSchema } from "@/validations/supplier.validations";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validation = createSupplierSchema.safeParse(body);

  if (!validation.success) {
    // Convert Zod errors to API ValidationError
    throw fromZodError(validation.error);
  }

  // ... proceed with creation
});
```

**Error Response Structure:**

```json
{
  "error": "Validation Failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fieldErrors": {
      "cnpj": ["CNPJ must contain exactly 14 digits"]
    },
    "formErrors": []
  }
}
```

---

### 6. **Translation File Structure**

**File:** [src/locales/en-US/errors.json](src/locales/en-US/errors.json)

```json
{
  "validation": {
    "required": "{field} is required",
    "invalidEmail": "Invalid email address",
    "passwordMinLength": "Password must be at least {min} characters",
    "passwordRequireUppercase": "Password must contain at least one uppercase letter",
    "passwordRequireLowercase": "Password must contain at least one lowercase letter",
    "passwordRequireNumber": "Password must contain at least one number",
    "passwordRequireSpecial": "Password must contain at least one special character",
    "passwordsDoNotMatch": "Passwords do not match"
  },
  "passwordStrength": {
    "label": "Password strength",
    "veryWeak": "Very Weak",
    "weak": "Weak",
    "fair": "Fair",
    "strong": "Strong",
    "veryStrong": "Very Strong"
  }
}
```

**File:** [src/locales/en-US/apps/suppliers.json](src/locales/en-US/apps/suppliers.json)

```json
{
  "fields": {
    "cnpj": "CNPJ",
    "cnpjPlaceholder": "Enter 14-digit CNPJ",
    "name": "Name",
    "namePlaceholder": "Enter supplier name",
    "city": "City"
  },
  "success": {
    "created": "Supplier created",
    "updated": "Supplier updated"
  }
}
```

---

## Comparison: Current Patterns in Use

| Pattern                          | Use Case                                         | Files                                               | Translation Support                   |
| -------------------------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------- |
| **Error Keys (Preferred)**       | Password strength, complex validations           | `password-policy.ts`, `use-password-policy.ts`      | ✅ Full i18n support with parameters  |
| **Runtime Translation**          | Conditional validation (mismatches, cross-field) | `change-password-modal.tsx`                         | ✅ Via `z.refine()` with `t()` calls  |
| **Hardcoded Messages (Current)** | Basic field validation                           | `supplier.validations.ts`, `invoice.validations.ts` | ❌ No localization, hardcoded English |
| **Server Error Details**         | API responses                                    | `fromZodError()` helper                             | ⚠️ Errors sent as-is from Zod         |

---

## Best Practices from Analysis

### ✅ Do Use

1. **Error Keys over Hardcoded Messages**
   - Store validation error keys in schemas
   - Translate them at display time in components
   - Enables full i18n support

2. **Parameter Support**
   - Include `params` in error objects for dynamic values
   - Example: `{ key: "validation.min", params: { min: 8 } }`

3. **Separation of Concerns**
   - Validation logic returns keys
   - Translation happens in hooks/components
   - Server sends error keys (or translate server-side)

4. **Runtime Translation for Conditional Rules**
   - Use `z.refine()` with `useTranslations()` for cross-field validations
   - Ensures translated error messages even for complex rules

### ❌ Don't Use

1. **Hardcoded English in Schemas**
   - Messages only work for English users
   - Difficult to maintain
   - No parameter support

2. **Translation Lookups in Multiple Places**
   - Keep translation logic centralized
   - Use hooks for consistent translation

3. **Server-Side Error Message Formatting**
   - Let client handle message formatting
   - Send error codes/keys from server
   - Client translates based on user locale

---

## Recommended Approach for Supplier Form

For the supplier form validation, use the **error key pattern**:

```typescript
// src/validations/supplier.validations.ts
const cnpjValidation = z
  .string()
  .trim()
  .regex(/^\d{14}$/, "validation.cnpjFormat"); // Use error key

const nameValidation = z
  .string()
  .trim()
  .min(1, "validation.required") // Use error key with field context
  .max(200, "validation.nameTooLong");

const cityValidation = z
  .string()
  .trim()
  .min(1, "validation.required")
  .max(100, "validation.cityTooLong");
```

Then translate in the hook:

```typescript
// src/hooks/admin/use-suppliers.ts (or create new file)
export const useSupplierValidationTranslation = () => {
  const t = useTranslations("errors");
  const tFields = useTranslations("apps/suppliers.fields");

  return (fieldName: string, errorKey: string, params?: Record<string, any>) => {
    if (errorKey === "validation.required") {
      return t("validation.required", { field: tFields(fieldName) });
    }
    return t(errorKey, params);
  };
};
```

---

## Files Summary

Key files demonstrating translation patterns:

| File                                                                                                           | Purpose                       | Pattern                           |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------- |
| [src/lib/password-policy.ts](src/lib/password-policy.ts)                                                       | Validation with error keys    | Error keys + parameters           |
| [src/hooks/public/use-password-policy.ts](src/hooks/public/use-password-policy.ts)                             | Hook for translating errors   | Error key translation             |
| [src/components/shared/password-strength-indicator.tsx](src/components/shared/password-strength-indicator.tsx) | Display translated errors     | Consume translated results        |
| [src/components/admin/change-password-modal.tsx](src/components/admin/change-password-modal.tsx)               | Form with runtime translation | `z.refine()` with `t()`           |
| [src/locales/en-US/errors.json](src/locales/en-US/errors.json)                                                 | Error message translations    | i18n keys and parameters          |
| [src/validations/supplier.validations.ts](src/validations/supplier.validations.ts)                             | Current supplier schema       | Hardcoded messages (needs update) |
| [src/app/api/admin/invoices/suppliers/route.ts](src/app/api/admin/invoices/suppliers/route.ts)                 | API endpoint validation       | `fromZodError()` helper           |
