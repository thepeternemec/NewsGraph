# Pleiades API Roadmap Review

**From the v0.1 "beats" foundation to the Real-Time News Terminal vision**

*Audit date: September 2026 · Evidence: live probes of `https://openbeat.vercel.app` plus the published developer guide at `/docs`. Integration research cited inline and in [Sources](#sources).*

> **Naming note:** the product is now branded **Pleiades** (`pleiades.news`). The audited v0.1 deployment still runs under the legacy name OpenBeat at `https://openbeat.vercel.app` until cutover; legacy `openbeat_*` tool names and URLs below refer to that origin. This repo (`pleiades/`) is the v0.2 codebase that realizes this roadmap.

---

## 1. Executive summary

Pleiades v0.1 is a **remarkably clean agent-facing contract** — catalog → resolve → poll/delta with cursors, receipts, and a rail-agnostic prepaid ledger — but it is ~20% of the product described in the vision. The vision needs six new subsystems, and the good news is that the existing schema was clearly designed for them:

| Vision claim | Capability needed | State today | Planned phase |
|---|---|---|---|
| Scan thousands of sources 24/7 | Scheduled multi-beat ingestion | ❌ No live ingestion | Phase 1 |
| Continuously expanding topical coverage | Self-service beat creation, concept graph | ❌ 20 operator-seeded beats only | Phases 2 + 5 |
| Cut noise → actionable signals | Dedup, event clustering, sentiment, LLM triage | 🟡 Schema has `event_id`, `corroboration`, `sentiment` fields; no data flows into them | Phases 1 + 5 |
| Programmable API | resolve / poll / delta | ✅ Contract shipped (with bugs, see §3) | Phase 0 |
| WebSocket delivery | Push channel over pack advancement | ❌ Pull-only | Phase 2 |
| Telegram + Discord bots | Outbound delivery services | ❌ None | Phase 3 |
| Virtuals ACP | On-chain job/memo commerce | ❌ None | Phase 4 |
| Coinbase x402 | HTTP 402 payment facilitation in USDC | 🟡 `X-PAYMENT` header + `rail` field already anticipate it | Phase 4 |
| newsapi.ai structured filtering | Concept-URI queries, events, sentiment | 🟡 Catalog's `concept_uris` are already in newsapi.ai's dialect | Phase 1 |
| Trader / creator / media / agent workflows | Audience-specific products on top of the API | ❌ None | Phase 5 |

**Bottom line:** the highest-leverage move is *not* more endpoints — it is **Phase 1 ingestion**. Every audience promise in the vision currently fails because there is no live news behind the contract. Phase 0 (contract fixes) and Phase 1 can ship together and make the existing API genuinely usable end-to-end.

**Critical caveat:** a "scan thousands of sources 24/7" story has real cost, rate-limit, and licensing implications (§7). One provider query can serve thousands of users if caching is designed correctly; the opposite design bankrupts the service.

---

## 2. What was verified live (September 2026)

Probes against the production origin:

| Endpoint | Result |
|---|---|
| `GET /` | `{"service":"Pleiades","version":"0.1.0", ...}` JSON descriptor; no landing page |
| `GET /health` | `200` `{"ok":true,"version":"0.1.0"}` |
| `GET /ready` | `200` `{"ok":true}` — database migration check passes |
| `GET /v1/catalog` | 20 warm beats with stable IDs, `concept_uris` (Wikipedia URIs), `languages`, `refresh_interval_minutes: 60`, `freshness_slo_minutes: 90` |
| `GET /v1/tools` | 3 function definitions (`pleiades_resolve`, `pleiades_poll`, `pleiades_delta`) |
| `POST /v1/resolve` | ⚠️ returns `{"error":"internal_error"}` (500) even for a catalog-covered task |
| `POST /v1/poll` (no credential) | `402 insufficient_balance` — price `4000` micros/moved poll; manual funding tier `5,000,000` micros ≈ 1,250 moved polls; deposit endpoint is `manual` rail only |

The 402 response is well-formed (`resource`, `balance_micros`, `deposit.providers[]` with `rail`, `tiers`, `instructions`) — confirmed the billing contract works even with no news behind it.

### Confirmed strengths

1. **Cursor discipline** — signed, beat-bound, opaque cursors with a documented 30-day depth ceiling. This is the right primitive for agent polling loops.
2. **Bounded tokens per pack** — ≤8 items, ≤800 token estimate, never full bodies. Cost-predictable by design.
3. **Rail-agnostic ledger** — receipts carry a `rail` field and deposits enumerate `providers[].rail`. x402 slots in as a new rail without a schema rewrite.
4. **`X-PAYMENT` header** — same header name the x402 ecosystem standardizes on; forward-compatible choice.
5. **Catalog schema** — `concept_uris` use `http://en.wikipedia.org/wiki/...` URIs, which is exactly the `conceptUri` dialect [newsapi.ai (Event Registry)](https://newsapi.ai/documentation) queries with. Ingestion is a low-friction integration, not a rebuild.

### Findings (severity-ordered)

| # | Finding | Severity | Fix phase |
|---|---|---|---|
| F1 | `POST /v1/resolve` returns bare `internal_error` (500) in production; docs promise structured `beats` + `unavailable[].reason: "not_in_v0_catalog"` | High — agents treat 500 as retryable, creating loops | 0 |
| F2 | Metered calls have no idempotency key; a retry after a lost response can double-charge (docs admit this) | High — billing trust | 0 |
| F3 | No public price-list endpoint; pricing is only discoverable by triggering a 402 | Medium — agents can't plan spend | 0 |
| F4 | No OpenAPI document; only an HTML guide + 3 tool definitions | Medium — blocks standard agent/tooling interop | 0 |
| F5 | Late-arriving items with publication time ≤ an advanced cursor are unrecoverable ("delta cannot guarantee recovery") | Medium — silent signal loss | 1 |
| F6 | No self-service deposits (`501 manual_funding_only`) — every customer needs a manual operator grant | High for growth, by design for now | 4 |
| F7 | No push channel: agents must poll on their own cadence; "machine-speed" claims are impossible | High vs. vision | 2 |
| F8 | No live ingestion, no packs (`503 pack_not_ready`), resolve adapter unfinished | Critical vs. vision | 1 |
| F9 | Root URL is a JSON descriptor — no public site explains the product | Medium vs. vision (separate track) | parallel |

---

## 3. Phase 0 — Contract hardening (1–2 weeks)

Small changes that protect everything built later.

1. **F1:** Make `/v1/resolve` return the documented contract: `200` with `beats` + `unavailable[]`, or `503 {"error":"resolution_unavailable"}` while the graph adapter is unfinished. Never a bare 500 for a predictable state.
2. **F2:** Accept an `Idempotency-Key` header on `poll`/`delta`; store key + settlement result for ≥24h; replay the original response (same receipt) on repeat.
3. **F3:** Add `GET /v1/pricing` — unmetered, public: price card, depth multipliers (24h/7d/30d buckets), caps, all rails.
4. **F4:** Publish `/openapi.json` (and keep the human guide at `/docs`). Derive it from the same spec that generates `/v1/tools`.
5. Document the concurrency/rate model explicitly (per-key QPS, daily caps) in headers (`X-RateLimit-*`).

**Acceptance:** resolve no longer 500s; poll/delta retries are idempotent; a machine can compute a poll's cost before spending.

---

## 4. Phase 1 — Live ingestion via newsapi.ai (3–5 weeks)

The unlock. newsapi.ai (Event Registry) is the chosen provider; the catalog already speaks its language.

### 4.1 Provider surface used

From [newsapi.ai documentation](https://newsapi.ai/documentation) and the [dltHub pipeline reference](https://dlthub.com/context/pipeline/newsapi-ai-to-duckdb):

- Base URL `https://eventregistry.org/api/v1`, POST JSON with `apiKey`.
- `POST /article/getArticles` — articles by `conceptUri`, keywords, date window, language, `isDuplicateFilter: "skipDuplicates"`, `includeFields` (e.g. `sentiment`).
- `POST /event/getEvents` — **event clusters**; maps directly to Pleiades's `event_id` + `corroboration` ("distinct sources in cluster").
- `/suggestSourcesFast`, `/suggestCategoriesFast`, `/suggestConceptsFast` — for beat-authoring UX.
- Recommended agent pattern from the provider itself: **scan → triage → retrieve** — which is exactly Pleiades's poll/delta split.

### 4.2 Pipeline design

```
cron per beat (refresh_interval_minutes)
  → provider query: concept_uris[] + topic_filters, languages,
      window = now - freshness_window, skipDuplicates, includeFields=sentiment
  → event linkage: getEvents for same window → event_id, corroboration
  → normalize → store raw items (Supabase, already in stack per /ready)
  → pack generation per beat: ≤8 items, ≤800 token estimate, lede ≤320 chars
  → advance beat high-water mark → new signed cursor
  → emit pack (ready for Phase 2 push)
```

Notes and decisions:

- **One provider call serves all customers of a beat.** Packs are materialized per beat, not per user query. Provider cost is O(beats × refresh rate), not O(users). This is the single most important cost invariant of the whole product.
- **Multi-concept queries:** verify in the provider sandbox whether `getArticles` accepts arrays of `conceptUri` with OR semantics; if not, one call per concept with client-side merge.
- **Event clustering** is the noise-killer: `corroboration` gives "same story, N sources" velocity for free, feeding the later "signal" layer.
- **F5 fix:** keep a small re-ingest replay window (e.g., re-query `[now-2h, now]` each run) and store items keyed by event time, so a late-arriving item can be injected into the *next* pack rather than lost behind a cursor. Alternatively move cursors to ingestion-time ordering; decide in Phase 1.
- **Scheduler host (decided):** Supabase scheduled Edge Functions (`[functions.worker] schedule` in `config.toml`), with pg_cron as the per-beat fan-out option. Vercel is used only for the website/docs. The scheduler must be resilient (at-least-once, dedupe by provider URI).

### 4.3 Acceptance criteria

- All 20 warm beats return real items from `poll`/`delta`; `moved:false` behavior verified.
- `event_id`/`corroboration`/`sentiment` populated; dedupe keeps duplicate rate below an agreed threshold.
- Receipts debit correctly end-to-end (ledger already works).
- Freshness SLO measured: ≥95% of packs computed within `freshness_slo_minutes` of window.
- Provider usage ledger + budget alerts per beat/day (catch cost surprises before the bill).

---

## 5. Phase 2 — WebSocket & webhooks (2–3 weeks)

- `wss://…/v1/ws?beats=b_x,b_y&token=…` subscribing to pack-advance events. Frames: `hello`, `pack` (delta page shape), `receipt`, `heartbeat`, `error`, `resume(cursor)`.
- Keep pull (poll/delta) as the reference API; push is an accelerator, not a replacement. Every WS event reuses the exact pack/cursor/receipt semantics — no second mental model.
- **Hosting reality (decided):** Supabase Realtime broadcasting on pack-table inserts is the push path (least infra, already the platform). A small always-on WS gateway is only a fallback if fan-out outgrows Realtime plan caps.
- Signed **webhooks** as the self-hostable alternative: `POST /v1/webhooks` (URL, beats, HMAC secret), signed `X-Pleiades-Signature`, retry with backoff, delivery log. This is also the foundation for Phase 3 bots and for media-company CMS integrations.

**Acceptance:** a client receives a new pack ≤5s after pack generation; missed events recoverable via cursor `resume`; webhook delivery auditable.

---

## 6. Phase 3 — Telegram & Discord bots (2–3 weeks)

Thin clients over the Phase 2 pipeline — no new intelligence, just delivery:

- **Telegram bot:** `/start`, `/subscribe <beat>`, `/catalog`, per-chat alert settings (dedupe window, quiet hours, min corroboration), formatting = lede + source + sentiment badge + publisher link.
- **Discord bot:** slash commands for the same; plus per-server webhook delivery to channels.
- Billing: bot deliveries draw from the same prepaid balance (bots are just another `rail`/client type on the ledger). Enforce per-chat rate limits server-side.

**Acceptance:** end-to-end alert within the freshness SLO; a subscribed chat never receives duplicate events for the same `event_id` within its dedupe window.

---

## 7. Phase 4 — Agent-native rails: x402 + Virtuals ACP (+ MCP)

### 7.1 x402 payments (replaces operator-managed funding)

The existing ledger is already rail-shaped for this. [x402](https://docs.cdp.coinbase.com/x402/how-it-works) = HTTP 402 Payment Required + signed USDC settlement on Base, with the payment spec passed in response headers (`X-PAYMENT` family) and agentic accounts on Coinbase.

Flow to implement:

1. Agent calls `POST /v1/poll` without a prepaid credential.
2. Server responds `402` with the standard facilitation headers: price in USDC micros, settlement address (Base), network, memo (ties the payment to the request).
3. Buyer signs/sends USDC (Coinbase SDK / agentic wallet) and retries with the payment reference.
4. Server verifies the on-chain transfer, credits the agent's ledger, settles the call, returns the pack + receipt (`rail: "x402"`).

Decisions:

- Keep the **prepaid `X-PAYMENT` credential as the off-chain rail** (low-latency, cheap) and add **x402 as the self-serve on-chain rail** — this also retires F6 (`manual_funding_only`) for agent customers without a KYC-lite Stripe flow.
- Consider a Stripe rail later for human/company plans; the ledger doesn't care.
- Compliance: USDC rails need a clear money-transmission/T&Cs review before public launch; plan it in this phase, not after.

### 7.2 Virtuals ACP integration

From the [Agent Commerce Protocol repo](https://github.com/Virtual-Protocol/agent-commerce-protocol): v2 Solidity contracts (`ACPRouter` + AccountManager/JobManager/MemoManager/PaymentManager, LayerZero v2 cross-chain, networks incl. Base), MIT-licensed. The model: **accounts → jobs → memos**, with payment managed by the protocol.

Mapping onto Pleiades:

- Pleiades registers as an **ACP account** with job types:
  - `pleiades.watch` — monitor a beat for N packs (recurring job).
  - `pleiades.briefing` — one-shot structured digest for a task (Phase 5 capability).
- Job **memo** = the structured pack/briefing JSON (same schema as the API — one canonical item format everywhere).
- Payment via ACP `PaymentManager` (USDC), optionally cross-chain via `AssetManager`/LayerZero.

Sequencing: (1) off-chain ACP-compatible listing metadata first, (2) Base testnet contract integration (Foundry), (3) mainnet. Budget realistically: this is the deepest integration in the roadmap; treat it as a partnership-grade effort, and only after Phases 1–2 make the underlying intelligence real.

### 7.3 MCP server

Ship an `pleiades-mcp` server (npm) wrapping resolve/poll/delta/ws, reusing `/v1/tools` as its tool definitions. Important positioning note: newsapi.ai ships [its own MCP server](https://newsapi.ai/blog/newsapi-mcp-llm-news-research-workflow/); Pleiades's server must be the *curated, metered* alternative — same provider data, but beat-filtered, deduped, clustered, and priced per signal instead of per raw query.

---

## 8. Phase 5 — The intelligence layer (ongoing, starts after Phase 1)

This is where "actionable signals" actually come from. All LLM work happens **at pack-generation time** (amortized across users), never per-request.

1. **Triage/importance scoring** — provider fields (event size, corroboration, sentiment, source authority) + a model pass → `importance` 0–100.
2. **Pre-written summaries** — one ≤160-char summary per item, plus audience-styled variants (trader-brief, creator-angle, editorial-lede).
3. **Narratives** — event-cluster growth velocity → "emerging topic" detection with `narrative_id`; feeds the creator use case directly.
4. **Market signals** — entity→asset mapping (tickers), sentiment delta vs. prior window, event→asset tagging; typed as `signal_types[]` so traders can subscribe to machine-consumable signals, not prose.
5. **Self-service beat creation** — `POST /v1/beats` (concept URIs / keywords / languages / refresh tier) with operator review for abuse. This is what makes "continuously expanding topical coverage" true instead of a marketing line.
6. **Audience products** (depend on the above, built as products on the API): trader terminal, creator narrative dashboard, editorial curation console, agent feed config. API review scope ends at their data contracts; they're listed in [V2-CONTRACT.md](V2-CONTRACT.md) §briefings.

**Acceptance:** a trader can subscribe to `signal_types=["asset_sentiment_delta"]` for their watchlist; a creator gets a `narrative_id` with a ready summary before the topic trends; all of it costs the same bounded pack model.

---

## 9. Phase 6 — Scale & compliance

- Workspaces/multi-tenancy (org keys, member keys, per-key caps).
- Self-service billing: x402 + Stripe, usage dashboards.
- Catalog expansion: auto-generate beats from the provider concept graph + niche sector imports.
- High availability for scheduler + WS gateway; regional replication if editorial customers demand it.
- **Content licensing:** verify newsapi.ai/Event Registry [Terms](https://newsapi.ai/terms) for redistribution — attribution rules, resale of structured derivatives, commercial plan requirements. Pleiades items already carry `url`/`source` for citation, but *reselling* curated packs is a commercial activity that likely needs a commercial provider plan. Resolve this in writing **before** Phase 1 goes public, not after.
- Trademark/domain: brand is now **Pleiades** (`pleiades.news`); legacy v0.1 runs under the OpenBeat name at `openbeat.vercel.app` until cutover. Verify `openbeat.io` (which appears to belong to a music streaming product) creates no confusion risk, and register the `pleiades.news` domain.

---

## 10. Risks & open questions

1. **Provider cost model** (highest risk): newsapi.ai is usage-metered. Cost = O(beats × refresh rate), fixed regardless of users — good — but "thousands of topics" means thousands of hourly query sets. Mitigation: batch multi-concept queries (verify semantics), tier refresh rates (market beats 5–15 min, niche beats 60 min), cache aggressively, budget-alert per beat.
2. **Provider push capability unverified:** confirm whether Event Registry offers a streaming/notification endpoint; if it does, Phase 2 latency improves and poll-backfilling shrinks. Not assumed in this plan.
3. **Late-arrival semantics** (F5) must be settled in Phase 1 or the "never miss the signal" promise is false for edge cases.
4. **WS hosting on Vercel** — plan explicitly for Supabase Realtime or an external worker; don't discover the limitation mid-Phase 2.
5. **ACP depth** — full on-chain job/memo commerce is a multi-week Solidity effort with protocol coordination; de-risk with off-chain listings and Base testnet first.
6. **Licensing & compliance** — provider redistribution terms, x402/USDC T&Cs, editorial liability for trading signals (disclaimers required on trader-facing surfaces).
7. **Naming/brand** — unify the brand voice (Pleiades vs. "Gloria" remnant) before public-facing copy ships.

---

## 11. The next 30 days

1. Ship Phase 0 fixes (F1–F4) — a week or less, high trust payoff.
2. Sign a paid newsapi.ai plan; verify multi-concept query semantics + rate limits in the sandbox; run the licensing review in parallel.
3. Build Phase 1 for 3 pilot beats (e.g., `NVIDIA`, `ECB monetary policy`, `EU AI Act`) end-to-end: scheduler → provider → Supabase → packs → poll/delta → receipts.
4. Publish `/openapi.json` + pricing endpoint; announce the pilot to 5–10 agent/trader testers.
5. Begin Phase 2 WS design against the pilot's pack-generation flow (Supabase Realtime first).

---

## Sources

- Live Pleiades origin: `https://openbeat.vercel.app` (`/`, `/docs`, `/v1/catalog`, `/v1/tools`, `/health`, `/ready`, `/v1/resolve`, `/v1/poll`) — probed September 2026.
- [newsapi.ai documentation](https://newsapi.ai/documentation) and [MCP workflow guide](https://newsapi.ai/blog/newsapi-mcp-llm-news-research-workflow/).
- [dltHub: NewsAPI.ai pipeline reference](https://dlthub.com/context/pipeline/newsapi-ai-to-duckdb) (base URL, endpoints, auth).
- [Virtuals Protocol: Agent Commerce Protocol (GitHub)](https://github.com/Virtual-Protocol/agent-commerce-protocol).
- [Coinbase CDP: x402 docs](https://docs.cdp.coinbase.com/x402/welcome) and [How x402 works](https://docs.cdp.coinbase.com/x402/how-it-works).
- [newsapi.ai Terms of Service](https://newsapi.ai/terms) (licensing review pending).
