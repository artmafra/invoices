/**
 * @deprecated This barrel export file is deprecated. Import services directly from their runtime files instead:
 *
 * OLD (deprecated):
 * ```
 * import { activityService, userService } from "@/services";
 * ```
 *
 * NEW (recommended):
 * ```
 * import { activityService } from "@/services/runtime/activity";
 * import { userService } from "@/services/runtime/user";
 * ```
 *
 * This prevents unnecessary service initialization. When importing from this file,
 * ALL services are instantiated immediately, including heavyweight services that
 * connect to external resources (Redis, Google Cloud Storage, etc.).
 *
 * Using runtime imports allows selective initialization - only the services you
 * actually use will be instantiated, significantly improving script startup time
 * and preventing connection errors for unused services.
 */

// This file intentionally left empty. Use @/services/runtime/* imports instead.
export {};
