import type { Context } from "hono";
import { errorStatus, type ErrorCode } from "@pleiades/contracts";

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
