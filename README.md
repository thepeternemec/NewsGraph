# Pleiades

**News for your agents.** Connect an agent, discover a supported topic, read source-linked articles, and retrieve changes from a saved cursor.

## Customer news release

The current branch adds the redesigned website, news explorer, connection guide, v2 article stream and hosted MCP implementation. See [NEWS-ROLLOUT.md](docs/NEWS-ROLLOUT.md) for exact deployment status, validation evidence, operating limits and rollout steps. The live migration and deployment are pending; do not infer production availability from this source tree.

- Website: `/` · news explorer: `/dashboard` · connections: `/connect` · guide: `/docs`
- Agent discovery: `/llms.txt` and `/skill.md`
- News API: `/v2/topics`, `/v2/news`, `/v2/changes`, `/v2/tools`
- MCP: `/mcp` (standard Streamable HTTP)
- [Integration examples](examples/README.md): TypeScript, MCP and OpenRouter tool calling

```sh
npm ci
npm run build
npm test
npm run verify:local
npm run dev:web
```

`verify:local` uses deterministic test data and performs no external model or provider requests. The SDK is a workspace package, not an npm-published package. Production verification requires a configured source provider, the new database migration and deployed functions.

Supabase remains the backend and Vercel remains the intended website host. No existing v1 route or legacy worker is removed. The new `news-worker` is separately deployed and scheduled only after its first successful verification.

## Repository layout

```
pleiades/
├── apps/
│   ├── api/       # REST API — Node dev mirror of the Edge Function
│   ├── worker/    # ingestion logic — Node dev mirror of the Edge Function
│   ├── bots/      # Telegram + Discord delivery adapters (Phase 3)
│   └── web/       # pleiades.news landing site (Next.js → Vercel)
├── packages/
│   ├── contracts/ # canonical schemas: beats, packs, receipts, errors + seed catalog
│   └── sdk/       # TypeScript client for the API
├── supabase/
│   ├── functions/ # Edge Functions: api (REST), worker (ingestion cron)
│   │   └── _shared/  # GENERATED Deno modules — run `npm run sync:supabase`
│   ├── migrations/   # packs, ledger, receipts schema
│   └── README.md     # platform setup (supabase CLI, secrets, schedules)
├── scripts/
│   └── sync-supabase.mjs  # canonical sources → Deno _shared (single source of truth)
├── docs/
│   ├── VISION.md        # product vision & audience map
│   ├── ARCHITECTURE.md  # system design, data flow, repo map
│   ├── ROADMAP.md       # v0.1 audit → phased plan (Phases 0–6)
│   └── V2-CONTRACT.md   # proposed v2 endpoint/schema extensions
└── .github/workflows/ci.yml   # build + test + drift check + deno check
```

## Status

| Layer | State |
|---|---|
| Contract & schemas (`@pleiades/contracts`) | ✅ canonical v0.2 schema + 20 seed beats (mirrors the live v0.1 catalog) |
| API (`supabase/functions/api`) | ✅ serving `/health`, `/v1/catalog`, `/v1/tools`, `/v1/pricing`, `/openapi.json`; poll/delta serve **persisted packs** when Supabase is configured, honest `503` otherwise |
| Ingestion (`supabase/functions/worker`) | ✅ newsapi.ai fetch → event clustering → dedupe → pack → Supabase persistence; ledger billing loop pending (Phase 0/4) |
| Bots (`apps/bots`) | 🚧 Telegram/Discord delivery adapters; loop wired in Phase 3 |
| Webhooks | ✅ register/list/revoke on the API; HMAC-signed `pack.advanced` delivery from the worker |
| Realtime push | ✅ `@pleiades/realtime` client (pack inserts → canonical packs); Supabase Realtime enabled on `packs` |
| x402 / ACP / MCP | 📋 Phase 4 |
| Web (`apps/web`) | ✅ vision landing page (Vercel) |

**Legacy:** the audited v0.1 service ("OpenBeat") is live at `https://openbeat.vercel.app`. This repo is the v0.2 codebase; see [docs/ROADMAP.md](docs/ROADMAP.md) for the cutover plan.

## Quickstart — local Node dev

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

## Quickstart — Supabase (the runtime)

```bash
brew install supabase/tap/supabase deno   # one-time
supabase init && supabase link --project-ref <ref>
supabase db push
supabase secrets set NEWSAPI_API_KEY=<key>
supabase start                             # local Postgres + Realtime
supabase functions serve --no-verify-jwt   # api + worker locally
```

Full instructions, cron schedule, and deploy commands: [supabase/README.md](supabase/README.md).

## Generated code — keep it in sync

`supabase/functions/_shared/` is generated from `packages/contracts` + `apps/{api,worker}/src`.
After editing canonical sources:

```bash
npm run sync:supabase          # regenerate
npm run check:supabase         # CI enforces freshness with this
```

## Contributing

Work follows the phases in [docs/ROADMAP.md](docs/ROADMAP.md). Keep the `packages/contracts` schemas as the single source of truth — every surface (REST, WS, bots, ACP memos) reuses them.

## License

MIT — see [LICENSE](LICENSE).
