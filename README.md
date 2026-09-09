# Pleiades ⭐

**The real-time news terminal.** An AI-powered platform that delivers breaking insights to traders, content creators, AI agents, and media professionals — before stories reach the mainstream.

Pleiades combines real-time news discovery with intelligent curation at scale. It functions like an agentic system: scanning thousands of sources 24/7, filtering vast volumes of information through [newsapi.ai](https://newsapi.ai), and delivering structured, actionable signals.

> *"Markets move on news in seconds. Pleiades ensures you never miss the signal."*

## What Pleiades delivers

- **Machine-speed, structured signals** — every item is deduplicated, event-clustered, sentiment-scored, and bounded to a token budget, ready to plug into algorithmic stacks or human workflows.
- **Programmable delivery** — REST API, WebSocket, Telegram & Discord bots, MCP, and agent-native rails: [Virtuals ACP](https://github.com/Virtual-Protocol/agent-commerce-protocol) and [Coinbase x402](https://docs.cdp.coinbase.com/x402/welcome).
- **Audience-native products** — trader alerts and market signals; creator briefs and early narratives; agent consumable feeds; editorial curation and publication workflows.

## Repository layout

```
pleiades/
├── apps/
│   ├── api/       # REST API (Hono) — catalog, tools, pricing; deployable to Vercel
│   ├── worker/    # 24/7 ingestion: newsapi.ai → dedupe → packs (Phase 1)
│   ├── bots/      # Telegram + Discord delivery adapters (Phase 3)
│   └── web/       # pleiades.news landing site (Next.js)
├── packages/
│   ├── contracts/ # canonical schemas: beats, packs, receipts, errors + seed catalog
│   └── sdk/       # TypeScript client for the API
├── docs/
│   ├── VISION.md        # product vision & audience map
│   ├── ARCHITECTURE.md  # system design, data flow, repo map
│   ├── ROADMAP.md       # v0.1 audit → phased plan (Phases 0–6)
│   └── V2-CONTRACT.md   # proposed v2 endpoint/schema extensions
├── infra/
│   └── supabase/migrations/   # packs, ledger, receipts schema
└── .github/workflows/ci.yml
```

## Status

| Layer | State |
|---|---|
| Contract & schemas (`@pleiades/contracts`) | ✅ canonical v0.2 schema + 20 seed beats (mirrors the live v0.1 catalog) |
| API (`apps/api`) | ✅ serving `/health`, `/v1/catalog`, `/v1/tools`, `/v1/pricing`, `/openapi.json`; metered routes return honest `503` until ingestion lands |
| Ingestion (`apps/worker`) | 🚧 newsapi.ai client + pack builder implemented; Supabase persistence pending (Phase 1) |
| Bots (`apps/bots`) | 🚧 Telegram/Discord delivery adapters; loop wired in Phase 2/3 |
| WebSocket / webhooks | 📋 Phase 2 |
| x402 / ACP / MCP | 📋 Phase 4 |
| Web (`apps/web`) | ✅ vision landing page |

**Legacy:** the audited v0.1 service ("OpenBeat") is live at `https://openbeat.vercel.app`. This repo is the v0.2 codebase; see [docs/ROADMAP.md](docs/ROADMAP.md) for the cutover plan.

## Quickstart

```bash
npm install          # workspaces
npm run build        # contracts → sdk → apps
npm test             # contract tests (node --test)
npm run dev          # API at http://localhost:8787
npm run dev:web      # landing page at http://localhost:3000
npm run dev:worker   # dry-run ingestion (set NEWSAPI_API_KEY in .env)
```

Then:

```bash
curl http://localhost:8787/v1/catalog
curl http://localhost:8787/openapi.json
```

## Contributing

Work follows the phases in [docs/ROADMAP.md](docs/ROADMAP.md). Keep the `packages/contracts` schemas as the single source of truth — every surface (REST, WS, bots, ACP memos) reuses them.

## License

MIT — see [LICENSE](LICENSE).
