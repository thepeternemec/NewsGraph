import { z } from "zod";

/** Payment rails. `manual` is the legacy v0.1 rail; `x402`/`acp`/`stripe` are planned. */
export const RailSchema = z.enum(["manual", "prepaid", "x402", "acp", "stripe"]);

/** Money is carried as integer strings of USD micros: 1000000 micros = $1. */
export const MicrosSchema = z.string().regex(/^\d+$/);

export const DepositTierSchema = z.object({
  gross_micros: MicrosSchema,
  fee_micros: MicrosSchema,
  net_micros: MicrosSchema,
  buys_moved_polls: z.number().int().positive(),
});

export const DepositProviderSchema = z.object({
  id: z.string(),
  rail: RailSchema,
  tiers: z.array(DepositTierSchema),
  instructions: z.string(),
});

export const DepositInfoSchema = z.object({
  endpoint: z.string().url(),
  providers: z.array(DepositProviderSchema),
});
export type DepositInfo = z.infer<typeof DepositInfoSchema>;

export const ReceiptSchema = z.object({
  receipt_id: z.string(),
  agent_id: z.string(),
  call: z.enum(["poll", "delta", "briefing"]),
  beat_id: z.string(),
  amount_micros: MicrosSchema,
  rail: RailSchema,
  settled_at: z.string(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;

export const ReceiptsResponseSchema = z.object({
  receipts: z.array(ReceiptSchema),
  next: z
    .object({ since: z.string(), after: z.string() })
    .nullable(),
});
export type ReceiptsResponse = z.infer<typeof ReceiptsResponseSchema>;

/**
 * Pricing card. Prices verified against the live v0.1 origin where noted;
 * depth multipliers are placeholders pending the Phase 0 `/v1/pricing` rollout.
 */
export const PRICE_CARD = {
  currency: "USD",
  unit: "micros",
  calls: {
    /** Front door. Free to 100 calls a day, then near-free forever. */
    resolve: "1000",
    resolve_free_per_day: 100,
    /** Empty is nearly free so hourly polling is rational. */
    poll_empty: "500",
    /** Verified live: 402 quote on the v0.1 origin. */
    poll_moved: "4000",
    /** Warm delta reuses the same pack path as a moved poll. */
    delta_warm: "4000",
    delta_page: "4000",
    /** On-demand query against the replica; cached 15 minutes. */
    delta_cold: "20000",
    /** The only call that spends a mid-tier model. */
    briefing: "30000",
    /** 24-hour hold, at 60 or 15 minute refresh. */
    watch_60m: "150000",
    watch_15m: "500000",
  },
  /** Placeholder — confirm actual buckets with the v0.1 implementation. */
  depth_multipliers: {
    "24h": 1,
    "7d": 2,
    "30d": 3,
  },
  /** Verified live tier. */
  manual_tier: {
    gross_micros: "5000000",
    net_micros: "5000000",
    buys_moved_polls: 1250,
  },
} as const;
