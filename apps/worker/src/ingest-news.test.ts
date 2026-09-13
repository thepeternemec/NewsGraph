import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeArticles } from "./ingest-news.js";
const now = new Date("2026-09-13T12:00:00Z");
const article = { uri: "p1", title: "<b>Source headline</b>", body: "<p>A short excerpt.</p>", lang: "eng", url: "https://example.com/story?utm_source=mail", dateTime: "2026-09-13T10:00:00Z", source: { title: "Publisher" } };
test("ingestion canonicalizes and deduplicates source URLs without losing first indexed identity", () => { const rows = normalizeArticles([article, { ...article, uri: "p2", url: "https://example.com/story#fragment" }], now); assert.equal(rows.length, 1); assert.equal(rows[0]?.title, "Source headline"); assert.equal(rows[0]?.url, "https://example.com/story"); assert(!Object.hasOwn(rows[0]!, "first_indexed_at")); });
test("ingestion rejects invalid dates, unsafe URLs, non-English and stale articles", () => { for (const patch of [{ dateTime: "invalid" }, { url: "javascript:alert(1)" }, { lang: "deu" }, { dateTime: "2020-01-01T00:00:00Z" }, { dateTime: "2027-01-01T00:00:00Z" }])
    assert.equal(normalizeArticles([{ ...article, ...patch }], now).length, 0); });
