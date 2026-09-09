// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { z } from "npm:zod@^3.24.1";

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
    poll_moved: "4000", // verified live: 402 quote on openbeat.vercel.app
    delta_page: "4000",
    briefing: "12000", // proposed (Phase 5)
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
