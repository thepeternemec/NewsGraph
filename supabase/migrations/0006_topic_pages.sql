-- Pleiades 0006 — topic-page-driven beats (newsapi.ai MCP query model)
alter table beats add column if not exists topic_page_uri text;
alter table beats add column if not exists keywords text[] not null default '{}';
