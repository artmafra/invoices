/**
 * Google account status for linking/unlinking
 */
export interface GoogleAccountStatus {
  isLinked: boolean;
  account?: {
    providerAccountId: string;
  } | null;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Standard API success info used for UI-friendly codes.
 *
 * This is intentionally simple for now (no i18n params yet).
 */
export interface ApiSuccessInfo {
  code: string;
}

/**
 * @deprecated Use ApiErrorResponse instead
 */
export interface ApiError {
  error: string;
  details?: unknown;
}

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  /**
   * Legacy: many endpoints return `success: true`.
   * New: standardized endpoints return `success: { code }`.
   */
  success: boolean | ApiSuccessInfo;

  /** @deprecated Prefer `success.code` for UX decisions */
  message?: string;

  /** Optional payload when using a single envelope shape */
  data?: T;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * View Transitions API types
 * https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */
export interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

export interface DocumentWithViewTransition extends Document {
  startViewTransition?: (callback: () => void | Promise<void>) => ViewTransition;
}
