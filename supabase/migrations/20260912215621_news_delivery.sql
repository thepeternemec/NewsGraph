-- Append-only, URL-deduplicated delivery stream. Existing v1 tables remain intact.
create table public.news_articles (
  id bigint generated always as identity primary key,
  beat_id text not null references public.beats(beat_id),
  provider_uri text not null,
  title text not null check (char_length(title) <= 240),
  excerpt text not null check (char_length(excerpt) <= 320),
  url text not null check (url ~ '^https?://'),
  source text not null check (char_length(source) <= 120),
  published_at timestamptz not null,
  first_indexed_at timestamptz not null default now(),
  unique(beat_id, url)
);
create index news_articles_beat_id_idx on public.news_articles(beat_id,id);
create index news_articles_published_idx on public.news_articles(published_at);
create table public.news_ingestion_status (
  beat_id text primary key references public.beats(beat_id),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  last_article_count integer not null default 0
);
alter table public.news_articles enable row level security;
alter table public.news_ingestion_status enable row level security;
revoke all on public.news_articles, public.news_ingestion_status from anon, authenticated;
grant all on public.news_articles, public.news_ingestion_status to service_role;
grant usage, select on sequence public.news_articles_id_seq to service_role;
-- Serialize ID allocation and commit visibility. A reader can never advance
-- past a concurrently uncommitted insert with a lower sequence number.
create function public.append_news_articles(p_beat_id text, p_articles jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare inserted_count integer;
begin
  perform pg_advisory_xact_lock(762341987);
  if jsonb_typeof(p_articles) <> 'array' or jsonb_array_length(p_articles)>1000 then
    raise exception 'Invalid article batch';
  end if;
  insert into public.news_articles(beat_id,provider_uri,title,excerpt,url,source,published_at)
  select p_beat_id, item->>'provider_uri',left(item->>'title',240),left(coalesce(item->>'excerpt',''),320),item->>'url',left(item->>'source',120),(item->>'published_at')::timestamptz
  from jsonb_array_elements(p_articles) item
  where (item->>'published_at')::timestamptz >= now()-interval '30 days'
    and (item->>'published_at')::timestamptz <= now()+interval '5 minutes'
  on conflict(beat_id,url) do nothing;
  get diagnostics inserted_count = row_count;
  insert into public.news_ingestion_status(beat_id,last_checked_at,last_success_at,last_error,last_article_count)
  values(p_beat_id,now(),now(),null,inserted_count)
  on conflict(beat_id) do update set last_checked_at=excluded.last_checked_at,last_success_at=excluded.last_success_at,last_error=null,last_article_count=excluded.last_article_count;
  return inserted_count;
end; $$;
revoke execute on function public.append_news_articles(text,jsonb) from public,anon,authenticated;
grant execute on function public.append_news_articles(text,jsonb) to service_role;

-- Worker authorization: only a hash is accessible to the service, with the
-- original secret held by Vault for scheduled requests. Never return it.
create table public.news_worker_keys (token_hash text primary key);
alter table public.news_worker_keys enable row level security;
revoke all on public.news_worker_keys from anon,authenticated;
grant select on public.news_worker_keys to service_role;
do $$
declare token text := encode(gen_random_bytes(32),'hex');
begin
  perform vault.create_secret(token,'pleiades_news_worker','Internal news ingestion schedule');
  insert into public.news_worker_keys(token_hash) values(encode(sha256(convert_to(token,'UTF8')),'hex'));
end $$;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
