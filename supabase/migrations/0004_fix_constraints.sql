-- Pleiades 0004 — align constraints with the Phase 1 data model
-- (applied after real provider data revealed the mismatches)

-- An item's event_id is informational (provider event URI from
-- includeArticleEventUri); the events table is a derived cluster store and may
-- not contain every article's event. Decouple to avoid spurious FK failures.
alter table pack_items drop constraint if exists pack_items_event_id_fk;

-- Cursor uniqueness at the DB level is too strict for repeated cycles;
-- app-level dedupe (skip when the latest pack cursor is unchanged) is the
-- guard. A signed, idempotent cursor design is Phase 0/4 work.
drop index if exists packs_beat_cursor_idx;
