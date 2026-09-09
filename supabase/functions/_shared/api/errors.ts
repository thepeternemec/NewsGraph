// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import type { Context } from "npm:hono@^4.6.14";
import { errorStatus, type ErrorCode } from "../contracts/index.ts";

/** Uniform application error response. */
export function errorResponse(
  c: Context,
  status: number,
  code: ErrorCode,
  extra: Record<string, unknown> = {},
) {
  return c.json({ error: code, ...extra }, status as 400);
}

/** Error response whose status is derived from the error code. */
export function errorByCode(c: Context, code: ErrorCode, extra: Record<string, unknown> = {}) {
  return errorResponse(c, errorStatus(code), code, extra);
}
