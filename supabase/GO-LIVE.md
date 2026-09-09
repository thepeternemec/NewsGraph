# Pleiades — Supabase go-live runbook

Copy-paste sequence to bring the backend up on Supabase. ~15 minutes.
The website already runs on Vercel; this makes the API + 24/7 ingestion live.

## 0. Prerequisites

- A Supabase project: [dashboard → New project](https://supabase.com/dashboard) — note the **project ref** (from the URL: `https://supabase.com/dashboard/project/<ref>`).
- CLI + Deno (one-time):

```bash
brew install supabase/tap/supabase deno
supabase --version
```

- `NEWSAPI_API_KEY` at hand.
- Docker only if you want a **local** stack (`supabase start`) — not required for this runbook.

## 1. Init & link (repo root)

```bash
cd pleiades            # repo root
supabase init          # generates supabase/config.toml (skip if present)
supabase link --project-ref <YOUR_PROJECT_REF>
```

## 2. Configure the functions

Append to `supabase/config.toml`:

```toml
[functions.api]
enabled = true
verify_jwt = false        # public REST API

[functions.worker]
enabled = true
verify_jwt = false        # invoked by cron + manual trigger
schedule = "*/15 * * * *" # one ingestion pass every 15 minutes
```

## 3. Apply schema + seed beats

```bash
supabase db push
```

This runs `supabase/migrations/0001_init.sql` (core tables), `0002_phase1.sql`
(high-water, receipt ids), and `0003_seed_beats.sql` (**seeds the 20 warm beats**
and enables Realtime on `packs` for Phase 2). Verify: `beats` table has 20 rows.

## 4. Secrets

```bash
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected into functions.
supabase secrets set NEWSAPI_API_KEY=<your-key>
```

## 5. Deploy functions

```bash
supabase functions deploy api --no-verify-jwt
supabase functions deploy worker --no-verify-jwt   # also registers the cron schedule
```

## 6. First ingestion cycle

```bash
curl -s -X POST "https://<REF>.supabase.co/functions/v1/worker"
# → {"ok":true,"beats":20,"summaries":[{"beat_id":"b_bb964843350e","label":"NVIDIA","items":8,...}]}
```

Each summary should show `persisted: true` and `items > 0`. **If every beat shows
`items: 0`**, the provider event/query field names need adjusting in
`apps/worker/src/newsapi.ts` — check the function logs (dashboard → Edge Functions
→ worker → Logs) and see Troubleshooting below.

## 7. Verify the API

The REST API is served under the function path (custom domains are a paid
option; this is the default):

```bash
BASE="https://<REF>.supabase.co/functions/v1/api"

curl -s "$BASE/v1/catalog" | jq '.beats | length'          # → 20

curl -s -X POST "$BASE/v1/poll" \
  -H 'Content-Type: application/json' \
  -d '{"beat_id":"b_bb964843350e"}' | jq '.item_count'     # → pack with items
```

`@pleiades/sdk` clients point `baseUrl` at `https://<REF>.supabase.co/functions/v1/api`.

## 8. What is now live

| Capability | Where |
|---|---|
| Catalog, tools, pricing, openapi | `…/functions/v1/api/*` |
| Poll / delta with real packs | same — served from persisted packs |
| 24/7 ingestion | worker cron (`*/15 * * * *`) |
| Realtime broadcast on packs | ready for Phase 2 clients |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Worker `internal_error` | missing key, or provider field names | check logs; verify `getEvents` response fields against the newsapi.ai sandbox with your key, adjust `ProviderEventSchema` |
| Poll → `pack_not_ready` after a good cycle | beats table not seeded | confirm migration `0003_seed_beats.sql` applied (`supabase db push`), then re-run worker |
| Cron not firing | schedule added after deploy | edit `config.toml` and `supabase functions deploy worker` again |
| `beat_unavailable` for a seed beat | API catalog vs DB mismatch | catalog is served from contracts seed; poll checks the DB — keep both in sync via `npm run sync:supabase` |
| Local dev without Docker | — | skip `supabase start`; use the linked hosted project directly |

## Cutover note

The legacy v0.1 origin (`openbeat.vercel.app`) can keep serving until its
traffic is moved to the new function URL; the contract shapes are compatible.
