# Supabase platform setup

Supabase is the single platform: Postgres (ledger, packs, receipts), Edge
Functions (API + ingestion worker), Realtime (push), Auth, and Storage.
Vercel hosts only the `apps/web` site/docs.

## One-time setup

```bash
# 1. Install the CLI (and Deno, required by functions)
brew install supabase/tap/supabase deno

# 2. Init & link the project (creates a full config.toml)
supabase init
supabase link --project-ref <your-project-ref>

# 3. Apply the schema
supabase db push

# 4. Set secrets
supabase secrets set NEWSAPI_API_KEY=<your-key>

# 5. Serve everything locally
supabase start          # Postgres, Realtime, Auth
supabase functions serve --no-verify-jwt
```

## Function schedule (ingestion)

After `supabase init`, add these blocks to `supabase/config.toml`:

```toml
[functions.api]
enabled = true
verify_jwt = false        # public REST API

[functions.worker]
enabled = true
verify_jwt = false        # invoked by cron + manual triggers
schedule = "*/15 * * * *" # beat refresh cadence; per-beat fan-out lands in Phase 1
```

## Deploy

```bash
supabase functions deploy api --no-verify-jwt
supabase functions deploy worker --no-verify-jwt
```

## Generated code — keep it in sync

`supabase/functions/_shared/` is generated from the canonical Node sources
(`packages/contracts`, `apps/api/src`, `apps/worker/src`). After editing those:

```bash
npm run sync:supabase        # regenerate
npm run sync:supabase -- --check   # CI enforces freshness with this
```

## Realtime (Phase 2)

Push will use Supabase Realtime on `postgres_changes` over the `packs` table —
no dedicated WebSocket server needed. See `docs/V2-CONTRACT.md` §5 for the
protocol and `docs/ARCHITECTURE.md` §2 for the invariants.
