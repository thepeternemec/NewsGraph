# Customer news release

## Implemented and verified locally

- Website: `/`, customer news explorer `/dashboard`, connection setup `/connect`, guide `/docs`.
- Public read API: `/v2/topics`, `/v2/news`, `/v2/changes`, `/v2/tools`.
- Standard, stateless Streamable HTTP MCP at `/mcp` using the official SDK.
- Workspace TypeScript SDK and OpenRouter tool executor; bounded model-loop example.
- Append-only per-topic article delivery with URL deduplication, database-managed first indexed timestamps, signed topic-bound cursors and distinct history/change cursors.
- Separate `news-worker` function so deployment does not replace the legacy `worker` or change v1 ingestion behavior.
- A three-topic pilot (NVIDIA, Federal Reserve, EU AI Act), paginated upstream reads and explicit stale/unavailable status.

Run `npm test`, `npm run verify:local`, `npm run check:supabase`, and `npm run build`.
`verify:local` runs actual MCP, Hono, SDK and tool adapter code against a deterministic PostgREST fixture. It verifies 20 intervening articles over multiple pages, a late arrival, replay after retry, empty updates, and history separation. It does not validate the live provider, database migration, or host-specific installation.

## Rollout status

The live database migration check was blocked by automatic approval review because the account reached its usage limit. No database migration or Edge Function deployment was performed in this task. Production endpoints and fresh provider results therefore remain unverified. The website build has passed locally.

## Production sequence

1. Review and apply `supabase/migrations/20260912215621_news_delivery.sql` with the Supabase migration workflow. It adds new tables and a private worker credential in Vault; it does not alter legacy article data. Check database advisors afterward. Do not expose the Vault secret or service-role key in frontend code or logs.
2. Run `npm run sync:supabase` and `deno check supabase/functions/api/index.ts supabase/functions/news-worker/index.ts`.
3. Deploy the existing `api` function and the separate `news-worker`. Preserve the API's existing public-read configuration. `news-worker` uses custom secret authentication. No changes are needed to the legacy `worker` function.
4. Ensure the existing `NEWSAPI_API_KEY` is valid. Start with the three default pilot topics. Inspect actual source relevance and provider allowance before adding topics.
5. Invoke one worker cycle from SQL using the Vault credential, without displaying it:

```sql
select net.http_post(
  url := 'https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/news-worker',
  headers := jsonb_build_object('Content-Type','application/json',
    'x-pleiades-worker-key',(select decrypted_secret from vault.decrypted_secrets where name='pleiades_news_worker')),
  body := '{}'::jsonb,
  timeout_milliseconds := 120000
) as request_id;
```

6. Inspect the corresponding response in `net._http_response` and check `news_ingestion_status`. A 200 and `ok:true` are required; a queued request alone is not completion. Provider failures or a window exceeding 500 articles must be resolved before claiming freshness. Review coverage counts and sample publisher links.
7. Run `PLEIADES_API_BASE_URL=https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api npm run verify:integrations`. These tests validate the live news interfaces. Run `examples/openrouter-agent.mjs` separately with an authorized model key to verify paid model inference.
8. Only after a successful ingestion cycle, activate the reviewed schedule below. It polls three topics hourly, using up to five provider page requests per topic per cycle. Check your provider allowance first; no recurring schedule is created automatically by this migration.

```sql
select cron.schedule('pleiades-news-hourly','7 * * * *',$job$
  select net.http_post(
    url := 'https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/news-worker',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-pleiades-worker-key',(select decrypted_secret from vault.decrypted_secrets where name='pleiades_news_worker')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$job$);
```

9. Publish the reviewed website on its existing Vercel project. Set `NEXT_PUBLIC_API_BASE_URL` if the API address differs. Confirm the website's real project/account first: the connected team returned no projects during this task. Do not create a replacement production project or change DNS to compensate.
10. Verify topic selection, article links, follow/unfollow persistence on the device, history pagination, endpoint check, and narrow-screen layout against the deployed service. Until then, do not advertise three named agent hosts as verified.

## Delivery semantics and operational limits

- Initial latest news establishes a baseline at the newest ingested ID. Earlier items remain available through history pagination. Changes replay newly ingested rows after that baseline, including older stories discovered late.
- IDs are returned as strings to preserve 64-bit integer precision. Stream writers use the ingestion RPC; all writers must take the same transaction lock so sequence allocation and commit visibility stay ordered.
- First indexed timestamps are assigned once by the database and are preserved on duplicate provider reads.
- Updates use a 30-day publication window. Cursors expire after 30 days. This is not an indefinite archive or a promise of complete publisher coverage.
- English language, valid HTTP(S) publisher URLs, valid publication times and excerpt bounds are checked before persistence. Missing language is not silently assumed to be English in v2.
- Token estimates are approximate bytes-based estimates for article items, not tokenizer-exact limits or totals including the response envelope.
- Pilot topic checks fetch at most 500 articles per cycle. If this does not exhaust the source window, freshness is not advanced. More active topics require a narrower provider query or an explicit request-budget increase.
- Public reads do not invoke paid model inference. The initial hosted MCP is read-only public early access. Hosted per-customer usage accounting, account-based following, and billing are not implemented.
- API access and provider redistribution rights must match your existing provider agreement before broader customer rollout.

## Rollback

The new tables are additive. Roll back the API/web deployment to their previous versions and pause the new cron job; leave new article data in place for investigation. Legacy v1 routes and the legacy worker remain available. Never drop the new tables as a routine rollback.
