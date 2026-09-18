/**
 * API keys and rate limiting.
 *
 * A key is a bearer token with no meaning beyond "this caller may go faster".
 * Only its SHA-256 is stored, so a database leak does not yield working keys,
 * and the plaintext is shown once at issue time and never again.
 */
import type { Sql } from "./client.js";

const KEY_PREFIX = "ng_";

/** 32 random bytes, hex. Long enough that guessing is not a threat model. */
export function newSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return KEY_PREFIX + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashKey(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ResolvedKey {
  keyHash: string;
  label: string;
}

/** Null for an unknown or revoked key — the caller is treated as anonymous. */
export async function resolveKey(sql: Sql, secret: string): Promise<ResolvedKey | null> {
  const keyHash = await hashKey(secret);
  const rows = await sql<Array<{ key_hash: string; label: string }>>`
    select key_hash, label from public.api_keys
    where key_hash = ${keyHash} and revoked_at is null
    limit 1`;
  const row = rows[0];
  if (!row) return null;
  // Fire-and-forget: a failed touch must never fail the request it rode in on.
  sql`update public.api_keys set last_used_at = now() where key_hash = ${keyHash}`.catch(() => {});
  return { keyHash: row.key_hash, label: row.label };
}

export async function createKey(sql: Sql, label: string): Promise<string> {
  const secret = newSecret();
  await sql`insert into public.api_keys (key_hash, label) values (${await hashKey(secret)}, ${label})`;
  return secret;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window rolls over. */
  resetSeconds: number;
}

/**
 * Count one request against a bucket, and say whether it is allowed.
 *
 * The upsert does the increment and the read in one round trip, so concurrent
 * requests serialise on the primary key rather than racing on a select-then-set.
 */
export async function consumeRateLimit(sql: Sql, bucket: string, limit: number): Promise<RateLimitResult> {
  const rows = await sql<Array<{ count: number; window_start: Date }>>`
    insert into public.api_usage (bucket, window_start, count)
    values (${bucket}, date_trunc('minute', now()), 1)
    on conflict (bucket, window_start) do update set count = public.api_usage.count + 1
    returning count, window_start`;
  const row = rows[0];
  const count = row?.count ?? 1;
  const started = row?.window_start ? new Date(row.window_start).getTime() : Date.now();
  const resetSeconds = Math.max(1, Math.ceil((started + 60_000 - Date.now()) / 1000));
  return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetSeconds };
}

/** Drop windows that can no longer be counted against. Run from the cron. */
export async function sweepUsage(sql: Sql): Promise<number> {
  const rows = await sql<Array<{ deleted: number }>>`
    with gone as (delete from public.api_usage where window_start < now() - interval '1 hour' returning 1)
    select count(*)::int as deleted from gone`;
  return rows[0]?.deleted ?? 0;
}
