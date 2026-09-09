import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPack, providerArticleToItem, toBase64Url, estimateTokens } from "./pack.js";
import type { ProviderArticle, ProviderEvent } from "./newsapi.js";
import type { Beat } from "@pleiades/contracts";

const beat: Beat = {
  beat_id: "b_bb964843350e",
  label: "NVIDIA",
  concept_uris: ["http://en.wikipedia.org/wiki/Nvidia"],
  topic_filters: [],
  languages: ["eng"],
  excludes: "Unrelated gaming reviews",
  state: "warm",
  refresh_interval_minutes: 60,
  freshness_slo_minutes: 90,
};

const article = (uri: string, title: string, dateTime: string): ProviderArticle => ({
  uri: `https://example.com/${uri}`,
  title,
  body: "",
  dateTime,
  source: { title: `Source-${uri}` },
  sentiment: 0.1,
});

test("lede is capped at 320 chars and never carries full bodies", () => {
  const longBody = "x".repeat(5000);
  const item = providerArticleToItem(
    { uri: "https://example.com/u1", title: "T", body: longBody, source: { title: "S" } },
    new Date(),
  );
  assert.ok(item.lede.length <= 320);
  assert.ok(!item.lede.includes(longBody)); // the full 5000-char body cannot fit
});

test("buildPack sorts newest-first and caps at 8 items", () => {
  const articles = Array.from({ length: 12 }, (_, i) =>
    article(`u${i}`, `Title ${i}`, `2026-09-10T${String(i).padStart(2, "0")}:00:00Z`),
  );
  const { pack } = buildPack(beat, articles, new Date("2026-09-10T12:00:00Z"));
  assert.equal(pack.items.length, 8);
  assert.equal(pack.items[0]?.url, "https://example.com/u11"); // newest first
  assert.equal(pack.items[7]?.url, "https://example.com/u4");
  assert.ok(pack.token_estimate <= 800);
});

test("event linkage fills event_id and corroboration", () => {
  const articles = [
    article("a1", "One", "2026-09-10T08:00:00Z"),
    article("a2", "Two", "2026-09-10T07:00:00Z"),
  ];
  const events: ProviderEvent[] = [
    { uri: "evt-1", articles: [{ uri: "https://example.com/a1" }, { uri: "https://example.com/a2" }] },
  ];
  const { pack } = buildPack(beat, articles, new Date("2026-09-10T09:00:00Z"), events);
  assert.equal(pack.items[0]?.event_id, "evt-1");
  assert.equal(pack.items[0]?.corroboration, 2); // two distinct sources
  assert.equal(pack.items[1]?.corroboration, 2);
});

test("cursor is base64url of beat_id:highWater and round-trips", () => {
  const { pack } = buildPack(
    beat,
    [article("a1", "One", "2026-09-10T08:00:00Z")],
    new Date("2026-09-10T09:00:00Z"),
  );
  const decoded = Buffer.from(pack.cursor, "base64url").toString("utf8");
  assert.match(decoded, /^b_bb964843350e:2026-09-10T08:00:00Z$/);
  assert.equal(toBase64Url("b_bb964843350e:2026-09-10T08:00:00Z"), pack.cursor);
});

test("token estimate is ~4 chars per token", () => {
  assert.equal(estimateTokens("12345678"), 2);
  assert.equal(estimateTokens("123456789"), 3);
});
