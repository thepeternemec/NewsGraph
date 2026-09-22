/**
 * Costs, and the ledger that records them.
 *
 * Phase 1 records; it does not enforce. Every billable call writes a row with
 * what it cost, so the prices can be checked against real traffic before anyone
 * is refused a call.
 *
 * Money is in **micro-dollars**, as integers: $0.0005 is 500. A float would
 * accumulate error across millions of sub-cent calls, and the error would fall
 * in our favour, which is the worst direction for it to fall.
 */
import type { Sql } from "./client.js";

export const MICRO_PER_DOLLAR = 1_000_000;

export const PRICE = {
  /** A check that found nothing. Nearly free, because most checks find nothing. */
  checkEmpty: 500,
  /** A check that found something — a bounded, cited pack. */
  checkMoved: 4_000,
  /** Cold history, cached for fifteen minutes. */
  deltaCold: 20_000,
  /** The brief: the product, and the only call that costs real money to answer. */
  brief: 30_000,
} as const;

export const TRIAL_MICRO = 5 * MICRO_PER_DOLLAR;

/**
 * What a response costs.
 *
 * Cost depends on the *result*, not the route: an empty check is a twentieth of
 * a cent and a check that moved is eight times that. Charging by route alone
 * would bill the same for "nothing happened" as for a pack of citations, and
 * "nothing happened" is the common case — it would make asking often irrational,
 * which is the one behaviour the product depends on.
 *
 * `/v2/topics` is free on purpose. It is the call that tells a customer what
 * exists, and metering it puts a toll booth in front of the shop window.
 */
export function costFor(path: string, body: unknown): number {
  const items = Array.isArray((body as { items?: unknown[] } | null)?.items)
    ? ((body as { items: unknown[] }).items.length)
    : null;

  if (path.includes("/v2/changes")) return items ? PRICE.checkMoved : PRICE.checkEmpty;
  if (path.includes("/v2/news")) return items ? PRICE.checkMoved : PRICE.checkEmpty;
  if (path.includes("/v2/brief")) return PRICE.brief;
  // Catalog, tool definitions, health and MCP framing are all discovery.
  // Tool calls *through* MCP are not billed yet; that is a known gap.
  return 0;
}

export interface UsageRecord {
  accountId?: string | null;
  keyHash?: string | null;
  route: string;
  beatId?: string | null;
  costMicro: number;
  /** Null while nothing enforces a balance. */
  creditsAfter?: number | null;
}

/** Append one row. Never throws: a ledger failure must not fail the request. */
export async function recordUsage(sql: Sql, row: UsageRecord): Promise<void> {
  try {
    await sql`
      insert into public.usage_ledger (account_id, key_hash, route, beat_id, cost_micro, credits_after)
      values (${row.accountId ?? null}, ${row.keyHash ?? null}, ${row.route},
              ${row.beatId ?? null}, ${row.costMicro}, ${row.creditsAfter ?? null})`;
  } catch (error) {
    // Best-effort, but not silent. The first version swallowed a NOT NULL
    // violation and recorded nothing for an hour while looking correct.
    console.error("usage ledger write failed:", error);
  }
}

export interface UsageSummary {
  calls: number;
  costMicro: number;
  emptyChecks: number;
  movedChecks: number;
}

/** What has been recorded, for checking the prices against reality. */
export async function usageSummary(sql: Sql, sinceHours = 24): Promise<UsageSummary> {
  const rows = await sql<
    Array<{ calls: number; cost: number; empty: number; moved: number }>
  >`
    select count(*)::int as calls,
           coalesce(sum(cost_micro), 0)::int as cost,
           count(*) filter (where cost_micro = ${PRICE.checkEmpty})::int as empty,
           count(*) filter (where cost_micro = ${PRICE.checkMoved})::int as moved
    from public.usage_ledger
    where created_at > now() - (${sinceHours} || ' hours')::interval`;
  const r = rows[0];
  return {
    calls: r?.calls ?? 0,
    costMicro: r?.cost ?? 0,
    emptyChecks: r?.empty ?? 0,
    movedChecks: r?.moved ?? 0,
  };
}
