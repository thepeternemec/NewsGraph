import { z } from "zod";
import { BEAT_ID_PATTERN } from "./beats.js";
import { ItemSchema } from "./packs.js";

/** Register a webhook: delivery URL + the beats it subscribes to. */
export const WebhookRegistrationRequestSchema = z.object({
  url: z.string().url(),
  beat_ids: z.array(z.string().regex(BEAT_ID_PATTERN)).min(1).max(20),
});
export type WebhookRegistrationRequest = z.infer<typeof WebhookRegistrationRequestSchema>;

/** Webhook record as returned by the list endpoint (secret never exposed). */
export const WebhookSchema = z.object({
  webhook_id: z.string().uuid(),
  url: z.string().url(),
  beat_ids: z.array(z.string().regex(BEAT_ID_PATTERN)),
  state: z.enum(["active", "failed", "revoked"]),
  created_at: z.string(),
});
export type Webhook = z.infer<typeof WebhookSchema>;

/** Registration response: the HMAC secret is shown exactly once. */
export const WebhookRegisteredSchema = WebhookSchema.extend({
  secret: z.string().min(32),
});
export type WebhookRegistered = z.infer<typeof WebhookRegisteredSchema>;

export const WebhookListResponseSchema = z.object({
  webhooks: z.array(WebhookSchema),
});
export type WebhookListResponse = z.infer<typeof WebhookListResponseSchema>;

/** Signed delivery payload — the pack event, exactly the delta page shape. */
export const WebhookDeliveryPayloadSchema = z.object({
  event: z.literal("pack.advanced"),
  beat_id: z.string().regex(BEAT_ID_PATTERN),
  cursor: z.string(),
  receipt_id: z.string(),
  item_count: z.number().int().min(0).max(8),
  items: z.array(ItemSchema).max(8),
});
export type WebhookDeliveryPayload = z.infer<typeof WebhookDeliveryPayloadSchema>;

/** Signature header format: `t=<unix-seconds>,v1=<hex HMAC-SHA256 of "t.body">`. */
export const WEBHOOK_SIGNATURE_VERSION = "v1";
