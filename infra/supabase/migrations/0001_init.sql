-- Pleiades 0001 — core schema (Phase 1)
-- Aligned with the canonical contracts in packages/contracts and the v0.1 API contract.

-- ── Beats ────────────────────────────────────────────────────────────
create table beats (
  beat_id text primary key,                     -- ^b_[0-9a-f]{12}$
  label text not null,
  concept_uris text[] not null default '{}',
  topic_filters text[] not null default '{}',
  languages text[] not null default '{eng}',
  excludes text not null default '',
  state text not null default 'warm' check (state in ('warm', 'cold')),
  refresh_interval_minutes int not null default 60,
  freshness_slo_minutes int not null default 90,
  created_at timestamptz not null default now()
);

-- ── Raw provider articles (dedupe by provider URI) ──────────────────
create table articles_raw (
  provider_uri text primary key,                -- newsapi.ai article URI
  beat_id text not null references beats (beat_id),
  title text,
  body text,
  published_at timestamptz,
  indexed_at timestamptz not null default now(),
  source_name text,
  sentiment double precision,                   -- -1..1 or null
  concepts text[] not null default '{}',
  event_uri text,                               -- provider event cluster URI
  raw jsonb not null default '{}'::jsonb
);
create index articles_raw_beat_published_idx on articles_raw (beat_id, published_at desc);

-- ── Events (clusters) ────────────────────────────────────────────────
create table events (
  event_id text primary key,                    -- internal id, e.g. evt_…
  beat_id text not null references beats (beat_id),
  provider_event_uri text,
  title text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  source_count int not null default 0           -- corroboration
);
create index events_beat_last_seen_idx on events (beat_id, last_seen_at desc);

-- ── Packs (materialized per beat — one provider query serves all users) ─
create table packs (
  pack_id uuid primary key default gen_random_uuid(),
  beat_id text not null references beats (beat_id),
  computed_at timestamptz not null default now(),
  cursor text not null,                          -- signed high-water cursor
  item_count int not null default 0 check (item_count between 0 and 8),
  token_estimate int not null default 0 check (token_estimate between 0 and 800),
  moved boolean not null default true
);
create index packs_beat_computed_idx on packs (beat_id, computed_at desc);
create unique index packs_beat_cursor_idx on packs (beat_id, cursor);

-- ── Pack items ───────────────────────────────────────────────────────
create table pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references packs (pack_id) on delete cascade,
  position int not null check (position between 0 and 7),
  lede text not null check (char_length(lede) <= 320),
  url text not null,
  source text not null,
  published_at timestamptz not null,
  first_indexed_at timestamptz not null,
  event_id text references events (event_id),
  corroboration int not null default 0 check (corroboration >= 0),
  concepts text[] not null default '{}',
  sentiment double precision,                   -- -1..1 or null
  -- Phase 5 enrichment (nullable until the intelligence layer lands)
  summary text,
  importance int check (importance between 0 and 100),
  signal_types text[] not null default '{}',
  tickers text[] not null default '{}',
  narrative_id text
);
create index pack_items_pack_idx on pack_items (pack_id, position);

-- ── Ledger & receipts (rail-agnostic billing) ────────────────────────
create table ledgers (
  agent_id text primary key,
  balance_micros bigint not null default 0 check (balance_micros >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table receipts (
  receipt_id text primary key,
  agent_id text not null,
  call text not null check (call in ('poll', 'delta', 'briefing')),
  beat_id text not null,
  amount_micros bigint not null check (amount_micros > 0),
  rail text not null check (rail in ('manual', 'prepaid', 'x402', 'acp', 'stripe')),
  settled_at timestamptz not null default now()
);
create index receipts_agent_settled_idx on receipts (agent_id, settled_at desc);

-- ── Webhooks (Phase 2) ───────────────────────────────────────────────
create table webhooks (
  webhook_id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  url text not null,
  beat_ids text[] not null default '{}',
  hmac_secret text not null,
  state text not null default 'active' check (state in ('active', 'failed', 'revoked')),
  created_at timestamptz not null default now()
);

-- Row-level security: enable, then grant per workspace in Phase 6.
alter table beats enable row level security;
alter table articles_raw enable row level security;
alter table packs enable row level security;
alter table pack_items enable row level security;
alter table ledgers enable row level security;
alter table receipts enable row level security;
alter table webhooks enable row level security;
