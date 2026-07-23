# Validation Patterns

This guide explains when and how to use different validation approaches in the codebase for consistent error handling with specific error codes.

## Philosophy

**Separation of Concerns:**

- **Zod schemas** = Structure validation (data types, formats, required fields)
- **Route handlers** = Business logic validation (policies, permissions, state checks)

This separation ensures error codes are specific and user-friendly rather than generic Zod validation messages.

## Pattern Guide

### ✅ Pattern 1: Pure Structure Validation in Zod

**When to use:** Validating request structure, data types, formats.

**Example:**

```typescript
// src/validations/user.validations.ts
export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
});
```

**Why:** Structure validation belongs in schemas. If it fails, client sent malformed data.

---

### ✅ Pattern 2: Business Logic in Route with Custom Error Codes

**When to use:** Policy checks, permissions, rate limits, state validations.

**Example:**

```typescript
// src/app/api/auth/step-up/route.ts
const validatedData = stepUpAuthSchema.parse(body);

// Policy check - NOT in Zod schema
if (!STEP_UP_CONFIG.METHODS.includes(validatedData.method as any)) {
  throw new ValidationError(
    `Step-up method "${validatedData.method}" is not allowed by policy`,
    "STEP_UP_METHOD_NOT_ALLOWED",
  );
}
```

**Why:**

- Produces specific error code (`STEP_UP_METHOD_NOT_ALLOWED` vs generic `VALIDATION_ERROR`)
- Client can show targeted message: "This authentication method is not allowed by policy"
- Easier to test and modify policies independently from schema

---

### ❌ Anti-Pattern: Business Logic in `.refine()`

**Don't do this:**

```typescript
// ❌ BAD: Business logic in schema
export const stepUpAuthSchema = z
  .discriminatedUnion("method", [/*...*/])
  .refine((data) => STEP_UP_CONFIG.METHODS.includes(data.method as any), {
    message: "Step-up method is not allowed by policy",
  });
```

**Why it's bad:**

- Produces generic `VALIDATION_ERROR` code
- Client cannot distinguish between "malformed request" vs "policy violation"
- Policy logic is hidden in schema instead of explicit in route
- Harder to test policies separately

---

### ✅ Pattern 3: Security Validation in Route with Specific Codes

**When to use:** Security checks like path traversal, injection attempts.

**Example:**

```typescript
// src/app/api/storage/[...key]/route.ts
for (const segment of segments) {
  if (!segment || segment === "." || segment === "..") {
    throw new ValidationError("Path traversal attempt detected", "PATH_TRAVERSAL_ATTEMPT");
  }

  if (segment.includes("/") || segment.includes("\\")) {
    throw new ValidationError("Invalid path separator in segment", "INVALID_PATH_SEPARATOR");
  }
}
```

**Why:**

- Different error codes for different security violations
- Enables security monitoring and alerting
- Better logging for audit trails
- Client gets appropriate user-facing message

---

### ✅ Pattern 4: Rate Limiting with `RateLimitError`

**When to use:** All rate limit checks.

**Example:**

```typescript
// ✅ GOOD: Use RateLimitError class
const rateLimitResult = await checkRateLimit("stepUpAuth", session.user.id);
if (rateLimitResult && !rateLimitResult.success) {
  await constantTimeDelay(100, 200);
  throw new RateLimitError("Too many step-up attempts. Please try again later.");
}
```

**Don't do this:**

```typescript
// ❌ BAD: Using ValidationError for rate limits
throw new ValidationError("Too many attempts. Please try again later.");
```

**Why:**

- `RateLimitError` automatically sets `RATE_LIMIT_EXCEEDED` code
- Semantic clarity: rate limiting is distinct from validation
- Enables rate limit monitoring and analytics
- Consistent handling across all endpoints

---

### Exception: UI-Only Validation in `.refine()`

**When allowed:** Pure client-side UX validation (no backend implications).

**Example:**

```typescript
// ✅ OK: Password confirmation is UI-only
export const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
```

**Why it's OK:**

- No business logic or policy
- Purely about form UX (password match)
- Generic validation error is appropriate

---

## Decision Tree

```
Is this validation checking...
│
├─ Data structure/format/types?
│  └─ ✅ Use Zod schema validation
│
├─ Business rule or policy?
│  └─ ✅ Validate in route handler with custom error code
│
├─ Security check (path traversal, injection)?
│  └─ ✅ Validate in route handler with specific security error code
│
├─ Rate limiting?
│  └─ ✅ Use RateLimitError class
│
└─ UI-only form validation (e.g., password match)?
   └─ ✅ OK to use `.refine()` in schema
```

## Error Code Guidelines

### 1. Always Provide Error Codes for Business Logic

```typescript
// ✅ GOOD
throw new ValidationError("Cannot deactivate your own account", "CANNOT_MODIFY_SELF");

// ❌ BAD
throw new ValidationError("Cannot deactivate your own account");
```

### 2. Use Semantic Error Classes

```typescript
// ✅ GOOD: Semantic class
throw new RateLimitError("Too many requests");

// ❌ BAD: Generic class for rate limiting
throw new ValidationError("Too many requests", "RATE_LIMIT_EXCEEDED");
```

### 3. Code Should Match Message Intent

```typescript
// ✅ GOOD: Code and message align
throw new ValidationError("Step-up method not allowed by policy", "STEP_UP_METHOD_NOT_ALLOWED");

// ❌ BAD: Generic code for specific message
throw new ValidationError(
  "Step-up method not allowed by policy",
  "VALIDATION_ERROR", // Too generic!
);
```

---

## Adding New Error Codes

### 1. Define the code in error mapping

```typescript
// src/lib/api-request-error.ts
const CODE_TO_MESSAGE_KEY = {
  // ... existing codes
  STEP_UP_METHOD_NOT_ALLOWED: "stepUpMethodNotAllowed",
} as const;

export type MutationErrorMessages = {
  // ... existing types
  stepUpMethodNotAllowed?: string;
};
```

### 2. Add translations

```json
// src/locales/en-US/profile.json
{
  "hooks": {
    "stepUp": {
      "errors": {
        "stepUpMethodNotAllowed": "This authentication method is not allowed by policy."
      }
    }
  }
}
```

```json
// src/locales/pt-BR/profile.json
{
  "hooks": {
    "stepUp": {
      "errors": {
        "stepUpMethodNotAllowed": "Este método de autenticação não é permitido pela política."
      }
    }
  }
}
```

### 3. Use the code in your hook

```typescript
// src/hooks/public/use-step-up-auth.ts
onError: (error: Error) => {
  handleMutationError(error, {
    stepUpMethodNotAllowed: t("errors.stepUpMethodNotAllowed"),
    fallback: t("errors.verifyFailed"),
  });
},
```

---

## Testing Validation Logic

### Structure Validation (Zod)

```typescript
describe("updateUserSchema", () => {
  it("should reject invalid email format", () => {
    expect(() => updateUserSchema.parse({ email: "not-an-email" })).toThrow(ZodError);
  });
});
```

### Business Logic (Route)

```typescript
describe("POST /api/auth/step-up", () => {
  it("should reject disabled step-up method", async () => {
    const response = await POST({ method: "passkey" });
    expect(response).toMatchObject({
      status: 400,
      json: {
        code: "STEP_UP_METHOD_NOT_ALLOWED",
      },
    });
  });
});
```

---

## Migration Checklist

When finding validation in `.refine()` that should be in route:

- [ ] Remove `.refine()` from schema
- [ ] Add validation logic to route handler
- [ ] Create specific error code (e.g., `STEP_UP_METHOD_NOT_ALLOWED`)
- [ ] Add code to `CODE_TO_MESSAGE_KEY`
- [ ] Add `MutationErrorMessages` type entry
- [ ] Add translations (en-US + pt-BR)
- [ ] Update hook's `onError` handler
- [ ] Test both success and error cases
- [ ] Update documentation if needed

---

## Summary

| Validation Type     | Location        | Error Class              | Example Code                 |
| ------------------- | --------------- | ------------------------ | ---------------------------- |
| Structure/Format    | Zod schema      | `ValidationError` (auto) | N/A (generic)                |
| Business Logic      | Route handler   | `ValidationError`        | `STEP_UP_METHOD_NOT_ALLOWED` |
| Security Checks     | Route handler   | `ValidationError`        | `PATH_TRAVERSAL_ATTEMPT`     |
| Rate Limiting       | Route handler   | `RateLimitError`         | `RATE_LIMIT_EXCEEDED` (auto) |
| UI-Only (exception) | Zod `.refine()` | `ValidationError` (auto) | N/A (generic)                |

**Golden Rule:** If the error needs a specific user-facing message or code, validate it in the route handler, not in Zod.
