// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

/** Application error codes — additive superset of the v0.1 contract. */
export const ERROR_CODES = [
  "invalid_request",
  "invalid_cursor",
  "cursor_beat_mismatch",
  "future_cursor",
  "invalid_since",
  "invalid_credential",
  "insufficient_balance",
  "blocked",
  "daily_cap",
  "beat_cap",
  "depth_ceiling",
  "beat_unavailable",
  "delta_timestamp_group_exceeds_pack_budget",
  "internal_error",
  "manual_funding_only",
  "pack_not_ready",
  // v0.2 additions
  "resolution_unavailable",
  "beat_quota_exceeded",
  "webhook_delivery_failed",
  "unsupported_rail",
  "database_not_configured",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorBody {
  error: ErrorCode;
  [key: string]: unknown;
}

/** HTTP status for each application error code. */
export function errorStatus(code: ErrorCode): number {
  switch (code) {
    case "invalid_request":
    case "invalid_cursor":
    case "cursor_beat_mismatch":
    case "future_cursor":
    case "invalid_since":
      return 400;
    case "invalid_credential":
      return 401;
    case "insufficient_balance":
      return 402;
    case "blocked":
    case "daily_cap":
    case "beat_cap":
    case "depth_ceiling":
    case "beat_quota_exceeded":
      return 403;
    case "beat_unavailable":
      return 404;
    case "delta_timestamp_group_exceeds_pack_budget":
      return 409;
    case "internal_error":
      return 500;
    case "manual_funding_only":
      return 501;
    case "pack_not_ready":
    case "resolution_unavailable":
    case "database_not_configured":
      return 503;
    case "webhook_delivery_failed":
      return 410;
    case "unsupported_rail":
      return 400;
  }
}
