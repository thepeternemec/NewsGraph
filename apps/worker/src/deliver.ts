import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WebhookDeliveryPayloadSchema,
  WEBHOOK_SIGNATURE_VERSION,
  type Pack,
} from "@pleiades/contracts";
import { activeWebhooksForBeat } from "@pleiades/db";

/**
 * Phase 2 webhook delivery. Runs inside the ingestion worker right after a
 * pack is persisted: one signed POST per active subscriber webhook.
 *
 * Signature (per docs/V2-CONTRACT.md §6):
 *   X-Pleiades-Signature: t=<unix-seconds>,v1=<hex HMAC-SHA256(secret, "t.body")>
 */

/** Portable HMAC-SHA256 (Web Crypto — Node ≥16 and Deno). Returns hex. */
export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signPayload(secret: string, body: string): Promise<string> {
  const t = Math.floor(Date.now() / 1000);
  const sig = await hmacSha256Hex(secret, `${t}.${body}`);
  return `t=${t},${WEBHOOK_SIGNATURE_VERSION}=${sig}`;
}

export interface WebhookDeliveryResult {
  attempted: number;
  delivered: number;
  failed: number;
}

/**
 * Deliver a pack to all active webhooks subscribed to its beat.
 * Single attempt with error logging; retry/backoff and failure-state
 * bookkeeping (state → 'failed') land with the delivery daemon later.
 */
export async function deliverWebhooksForPack(
  db: SupabaseClient | null,
  beatId: string,
  pack: Pack,
): Promise<WebhookDeliveryResult> {
  if (!db) return { attempted: 0, delivered: 0, failed: 0 };

  const webhooks = await activeWebhooksForBeat(db, beatId);
  let delivered = 0;
  let failed = 0;

  for (const webhook of webhooks) {
    const payload = WebhookDeliveryPayloadSchema.parse({
      event: "pack.advanced",
      beat_id: pack.beat_id,
      cursor: pack.cursor,
      receipt_id: pack.receipt_id,
      item_count: pack.item_count,
      items: pack.items,
    });
    const body = JSON.stringify(payload);
    const signature = await signPayload(webhook.hmac_secret, body);
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Pleiades-Event": "pack.advanced",
          "X-Pleiades-Signature": signature,
        },
        body,
      });
      if (response.ok) {
        delivered += 1;
      } else {
        failed += 1;
        console.error(`webhook ${webhook.webhook_id} rejected: HTTP ${response.status}`);
      }
    } catch (error) {
      failed += 1;
      console.error(`webhook ${webhook.webhook_id} unreachable:`, error);
    }
  }

  return { attempted: webhooks.length, delivered, failed };
}
