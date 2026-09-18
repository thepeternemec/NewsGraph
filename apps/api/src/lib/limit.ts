/**
 * Rate limiting.
 *
 * Keys are **optional**. An anonymous caller is limited by address; a keyed one
 * gets a higher ceiling. Nothing in the public contract changes — the project
 * documents the API as needing no credential in six places, and that stays true.
 *
 * Fails **open**. If the counter is unreachable the request is served rather
 * than refused: this is a free read API, and an outage in the limiter should not
 * become an outage in the product.
 */
import type { Context, Next } from "hono";
import { consumeRateLimit, db, env, hasDatabaseEnv, hashKey, resolveKey } from "@newsgraph/db";

const ANON_LIMIT = Math.max(1, Number(env("NEWSGRAPH_RATE_ANON") ?? 120));
const KEYED_LIMIT = Math.max(1, Number(env("NEWSGRAPH_RATE_KEYED") ?? 1200));

/** Advertised at the API root so clients can discover the ceiling. */
export const rateLimits = { anonymous: `${ANON_LIMIT}/minute`, with_key: `${KEYED_LIMIT}/minute` };

/** Vercel sets x-forwarded-for; the left-most entry is the client. */
function clientAddress(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return c.req.header("x-real-ip") ?? "unknown";
}

export async function rateLimit(c: Context, next: Next): Promise<Response | void> {
  // Preflights and liveness probes are not work and are not counted.
  if (c.req.method === "OPTIONS" || c.req.path.endsWith("/health") || !hasDatabaseEnv()) {
    return next();
  }

  const header = c.req.header("authorization") ?? "";
  const secret = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";

  let sql;
  try {
    sql = db();
  } catch {
    return next();
  }

  let bucket = "";
  let limit = ANON_LIMIT;
  let identified = false;
  try {
    const key = secret ? await resolveKey(sql, secret) : null;
    if (key) {
      bucket = `key:${key.keyHash}`;
      limit = KEYED_LIMIT;
      identified = true;
      c.header("X-RateLimit-Tier", "keyed");
    } else {
      // The address is hashed, never stored: a limiter does not need to know who.
      bucket = `ip:${await hashKey(clientAddress(c))}`;
      c.header("X-RateLimit-Tier", "anonymous");
    }

    const result = await consumeRateLimit(sql, bucket, limit);
    c.header("X-RateLimit-Limit", String(result.limit));
    c.header("X-RateLimit-Remaining", String(result.remaining));
    c.header("X-RateLimit-Reset", String(result.resetSeconds));

    if (!result.allowed) {
      c.header("Retry-After", String(result.resetSeconds));
      return c.json(
        {
          error: "rate_limited",
          detail: identified
            ? `This key allows ${result.limit} requests a minute. Retry in ${result.resetSeconds}s.`
            : `Anonymous callers are limited to ${result.limit} requests a minute. Retry in ${result.resetSeconds}s, or use a key for a higher ceiling.`,
          limit: result.limit,
          retry_after_seconds: result.resetSeconds,
        },
        429,
      );
    }
  } catch {
    // Counter unavailable — serve the request.
  }

  return next();
}
