-- Pleiades 0007 — English-only articles + article-cluster model
-- We no longer consume newsapi.ai event clustering (getEvents). Articles are
-- bucketed per beat, and a beat's bucket is the "article cluster".
alter table articles_raw add column if not exists lang text;
alter table pack_items  add column if not exists lang text;
create index if not exists pack_items_lang_idx on pack_items (lang);
