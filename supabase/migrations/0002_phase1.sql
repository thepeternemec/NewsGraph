-- Pleiades 0002 — Phase 1 ingestion support
-- Extends 0001 without breaking the v0.1 contract shape.

-- Per-beat high-water mark (max published time covered by the latest pack).
alter table beats add column if not exists high_water_at timestamptz;

-- Event clusters are keyed by provider URI (nullable: articles may be unclustered).
create unique index if not exists events_provider_uri_idx
  on events (provider_event_uri)
  where provider_event_uri is not null;

-- Packs carry the receipt id on the row so poll/delta can serve the full
-- contract shape before the ledger billing loop lands (receipt_id 'pending').
alter table packs add column if not exists receipt_id text not null default 'pending';

-- Fast path for the API's latest-pack lookup.
create index if not exists packs_beat_computed_desc_idx
  on packs (beat_id, computed_at desc);
