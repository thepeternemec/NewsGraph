# Pleiades v2 API Contract — Proposal

Proposed endpoint and schema extensions for the phases in [ROADMAP.md](ROADMAP.md). This is a design proposal to review against the v0.1 implementation; nothing here is deployed. All additions are backward-compatible: v0.1 clients keep working unchanged.

---

## 1. Design principles

1. **One item format everywhere.** The pack `item` schema is the single currency across REST, WebSocket, webhooks, bots, ACP memos, and briefings.
2. **Push reuses pull semantics.** Every pushed event is a delta page: same `cursor`, `receipt_id`, `moved` fields. No second mental model.
3. **Bounded tokens, amortized intelligence.** All enrichment (summaries, signals, narratives) is computed at pack time — one LLM pass serves every subscriber.
4. **Rail-agnostic billing.** The ledger keeps `rail` per receipt; new payment rails (x402, Stripe) never change the metering contract.
5. **Idempotency by default** on every metered mutation.

---

## 2. Identity & auth

| Mechanism | Header | Scope |
|---|---|---|
| API key (workspaces, Phase 6) | `Authorization: Bearer pk_…` | all endpoints, per-key caps |
| Prepaid spending credential (v0.1) | `X-PAYMENT: pl_…` | metered calls, off-chain rail |
| x402 facilitation (Phase 4) | standard x402 headers on `402` | on-chain USDC rail |

An authenticated principal can hold multiple rails; receipts disambiguate with `rail`.

---

## 3. New REST endpoints

| Endpoint | Phase | Purpose |
|---|---|---|
| `GET /v1/pricing` | 0 | Public price card: per-call prices, depth multipliers, caps, all rails. Unmetered. |
| `POST /v1/beats` | 5 | Create a custom beat (`concept_uris[]`, `keywords[]`, `languages[]`, `refresh_tier`, `excludes`). Operator-reviewed for abuse. |
| `GET /v1/beats/{beat_id}` / `PATCH` / `DELETE` | 5 | Manage own beats. |
| `POST /v1/webhooks` | 2 | Register delivery URL + beats + HMAC secret. Returns `webhopk_id`. |
| `GET /v1/webhooks` / `DELETE /v1/webhooks/{id}` | 2 | List / revoke; include delivery stats. |
| `GET /v1/ws` | 2 | WebSocket upgrade with beat subscriptions (see §5). |
| `POST /v1/briefings` | 5 | One-shot structured digest for a task or beat set (also the `pleiades.briefing` ACP job payload). |
| `POST /v1/deposit` | 4 | Replace `501 manual_funding_only` with rails: `x402` (on-chain USDC), `stripe` (later). |
| `GET /openapi.json` | 0 | Machine-readable spec; `/v1/tools` derives from it. |

New error codes (additive): `resolution_unavailable` (503), `beat_quota_exceeded` (403), `webhopk_delivery_failed` (per-webhook 410 on the webhook record), `unsupported_rail` (400 on deposit).

---

## 4. Idempotency (Phase 0, F2)

```
POST /v1/poll
Idempotency-Key: 7f2c…e91a
```

- Key scoped to principal; stored with the settlement result for ≥24h.
- Repeat of a settled key returns the **original response** (same `receipt_id`, same `cursor`) and does not re-debit.
- New key + same body = a new metered call (document this explicitly).

---

## 5. WebSocket protocol (Phase 2)

```
GET wss://openbeat.vercel.app/v1/ws?beats=b_e857ee04eb3f,b_dab9c000dca5&token=…
```

JSON frames, one per line. Server → client:

```json
{"type":"hello","session_id":"s_…","subscribed":["b_e857ee04eb3f"],"server_time":"2026-09-10T08:00:00Z"}
{"type":"pack","beat_id":"b_e857ee04eb3f","moved":true,"cursor":"opq…","receipt_id":"r_…","items":[…],"receipt_id_header":true}
{"type":"receipt","receipt_id":"r_…","amount_micros":"4000","rail":"prepaid"}
{"type":"heartbeat","t":1694332800}
{"type":"error","code":"depth_ceiling","message":"…"}
```

Client → server:

```json
{"type":"resume","beat_id":"b_…","cursor":"opq…"}   // recover missed packs
{"type":"subscribe","beat_ids":["b_…"]}
{"type":"unsubscribe","beat_ids":["b_…"]}
```

Rules:

- A `pack` frame is exactly the delta page shape; clients persist `cursor` + `receipt_id` exactly as in REST.
- Each pushed pack debits the ledger and emits a `receipt` frame — push is metered identically to pull (no free-ride ambiguity).
- `resume` replays from the cursor over a short replay window; beyond the window, the client falls back to REST delta (same code path).

Hosting note: first implementation over Supabase Realtime broadcast of pack inserts; migrate to a dedicated gateway if fan-out grows (see ROADMAP §5).

---

## 6. Webhooks (Phase 2)

```
POST https://customer.example/hooks/pleiades
X-Pleiades-Signature: t=1694332800,v1=<hex HMAC-SHA256(secret, "t.body")>
X-Pleiades-Event: pack.advanced
```

```json
{
  "event": "pack.advanced",
  "beat_id": "b_e857ee04eb3f",
  "cursor": "opq…",
  "receipt_id": "r_…",
  "item_count": 3,
  "items": [ /* pack item schema */ ]
}
```

- **Shipped in v0.2:** `POST /v1/webhooks` (register — secret returned once), `GET /v1/webhooks`, `DELETE /v1/webhooks/{id}` (revoke), delivery from the ingestion worker with the signature above. Retries with exponential backoff (5s → 24h max) and marking the webhook `webhook_delivery_failed` land with the delivery daemon.
- Subscriber must respond `2xx` within 5s; ack ≠ processed (document cursor discipline: process-then-commit).

---

## 7. Enriched item schema (Phase 5)

Extends the v0.1 pack item — all fields additive, all nullable:

```json
{
  "lede": "…≤320 chars…",
  "url": "https://publisher.example/article",
  "source": "Publisher Name",
  "published_at": "2026-09-10T07:58:00Z",
  "first_indexed_at": "2026-09-10T07:59:12Z",
  "event_id": "evt_…",
  "corroboration": 12,
  "concepts": ["http://en.wikipedia.org/wiki/Nvidia"],
  "sentiment": 0.31,

  "summary": "…≤160 chars, pre-written…",
  "importance": 0-100,
  "signal_types": ["asset_sentiment_delta", "event_velocity"],
  "tickers": ["NVDA"],
  "narrative_id": "nar_…",
  "audience_briefs": {
    "trader": "…≤240 chars…",
    "creator": "…≤240 chars…",
    "editorial": "…≤240 chars…"
  }
}
```

Cost rule: enrichment is computed once per pack; consumers never pay a per-user LLM cost.

---

## 8. x402 flow (Phase 4)

Replaces the `402 insufficient_balance` dead-end for uncredited agents:

1. `POST /v1/poll` without prepaid credential →
   ```
   HTTP/1.1 402 Payment Required
   X-PAYMENT-VERSION: 1
   X-PAYMENT-NETWORK: base
   X-PAYMENT-ADDRESS: 0x…
   X-PAYMENT-AMOUNT: 4000            (USDC micros = $0.004)
   X-PAYMENT-MEMO: pl_ledger_<agent_id>
   ```
   plus the JSON body with `resource`, `balance_micros`, `deposit` (mirrors v0.1 shape).
2. Buyer sends the USDC payment with the memo (Coinbase SDK / agentic wallet / ACP PaymentManager).
3. Client retries with `X-PAYMENT-REFERENCE: <tx-hash>`; server verifies the transfer on Base (with confirmations policy), credits the ledger, settles the call, returns the pack with `receipt.rail = "x402"`.
4. Subsequent calls can keep using x402 per-call or convert to a prepaid credential (documented in `/v1/pricing`).

Verification policy (decide at implementation): 1 confirmation for microtransactions under a threshold, N confirmations above; amount must match the memo exactly; no crediting on unconfirmed or mismatched transfers.

---

## 9. Virtuals ACP mapping (Phase 4)

Protocol structure (per the [ACP repo](https://github.com/Virtual-Protocol/agent-commerce-protocol)): accounts → jobs → memos, with PaymentManager and LayerZero v2 cross-chain settlement on Ethereum, Base, Polygon, Arbitrum, BNB.

| ACP concept | Pleiades mapping |
|---|---|
| Account | Pleiades service account (one per environment: testnet / mainnet) |
| Job `pleiades.watch` | Params: `beat_id`, `max_packs`, `window`. Recurring deliverable: N pack memos. |
| Job `pleiades.briefing` | Params: `task`, `depth_days`, `max_items`. One memo: structured digest (§10). |
| Memo | Canonical JSON: either a pack (same item schema) or a briefing envelope; includes `cursor`, `event_id`, `receipt_id` for reconciliation. |
| Payment | USDC via PaymentManager; receipt row records `rail: "acp"`, `jpl_id`, `memo_id`. |

Sequencing: off-chain listing metadata → Base testnet (Foundry, per ACP README) → mainnet. Treat as partnership-grade effort.

---

## 10. Briefings (Phase 5)

`POST /v1/briefings` — the one-shot intelligence product behind creator/media/trader workflows:

```json
{
  "task": "Explain today's movement in EU AI Act enforcement",
  "depth_days": 3,
  "audience": "trader",
  "max_items": 10
}
```

Response envelope (same envelope the ACP `briefing` memo uses):

```json
{
  "briefing_id": "bf_…",
  "computed_at": "…",
  "lede": "…pre-written narrative…",
  "items": [ /* ≤max_items, pack schema */ ],
  "narratives": [{"narrative_id":"nar_…","title":"…","velocity":"rising","sources":8}],
  "signals": [{"type":"asset_sentiment_delta","ticker":"NVDA","delta":0.18}],
  "sources_used": 14,
  "receipt_id": "r_…",
  "price_micros": "12000"
}
```

Rules: metered like poll/delta (higher price card entry), bounded by `max_items`, idempotency-keyed, 30-day depth ceiling applies.

---

## 11. Rate limits & quotas

| Scope | Default (proposal) |
|---|---|
| Unmetered reads (catalog, pricing, tools) | 60 req/min/key |
| Metered calls | 30 req/min/key + daily spend cap + per-beat cap (existing) |
| WS | 8 beats/session, 1 connection/key |
| Webhook deliveries | 60/beat/hour, batched to ≤10s windows |
| Custom beats | 20/workspace (free tier), more by plan |

Enforced with `429` + `X-RateLimit-Limit/-Remaining/-Reset` headers everywhere.

---

## 12. Open questions for review

1. Multi-concept `getArticles` semantics (OR vs AND) — settles Phase 1 query fan-out (ROADMAP §4).
2. Cursor timebase: publication-time vs ingestion-time ordering — settles F5 (ROADMAP §3).
3. x402 confirmation policy thresholds for microtransactions.
4. Whether push (`pack` frame) is metered at full poll price or a discounted push price card.
5. Custom-beat review workflow: instant with abuse-kill-switch, or operator queue? (abuse risk: concept-URI spam).
6. ACP memo size limits and gas costs for on-chain memos — may push large memos to IPFS/off-chain with hash anchoring.
