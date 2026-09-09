-- Pleiades 0005 — drop the event_id FK under its auto-generated name.
-- Migration 0004 dropped the wrong name ("pack_items_event_id_fk"); Postgres
-- generated "pack_items_event_id_fkey". The rationale is unchanged: an item's
-- event_id (provider event URI) is informational and the events table is a
-- derived cluster store that may not contain every article's event.
alter table pack_items drop constraint if exists pack_items_event_id_fkey;
