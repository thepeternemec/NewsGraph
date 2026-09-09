import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ItemSchema,
  PackSchema,
  PollResponseSchema,
  UnchangedPollSchema,
  PACK_LIMITS,
} from "./index.js";

const baseItem = {
  lede: "ECB holds rates steady as inflation cools.",
  url: "https://publisher.example/article-1",
  source: "Publisher",
  published_at: "2026-09-10T07:58:00Z",
  first_indexed_at: "2026-09-10T07:59:12Z",
  event_id: "evt_123",
  corroboration: 5,
  concepts: ["http://en.wikipedia.org/wiki/European_Central_Bank"],
  sentiment: 0.2,
};

test("unchanged poll parses as compact shape without items", () => {
  const parsed = PollResponseSchema.parse({
    beat_id: "b_4a0bab7a98f9",
    moved: false,
    cursor: "opaque-cursor",
    item_count: 0,
    receipt_id: "r_1",
  });
  assert.equal(parsed.moved, false);
  assert.ok(!("items" in parsed));
  UnchangedPollSchema.parse(parsed);
});

test("moved pack parses with item limits enforced", () => {
  const pack = {
    beat_id: "b_4a0bab7a98f9",
    beat_label: "ECB monetary policy",
    computed_at: "2026-09-10T08:00:00Z",
    freshness_slo_minutes: 90,
    cursor: "opaque-cursor-2",
    moved: true,
    item_count: 1,
    items: [baseItem],
    token_estimate: 210,
    receipt_id: "r_2",
  };
  const parsed = PackSchema.parse(pack);
  assert.equal(parsed.items.length, 1);
  assert.ok(parsed.token_estimate <= PACK_LIMITS.max_token_estimate);
});

test("lede over 320 chars and >8 items are rejected", () => {
  assert.throws(() =>
    ItemSchema.parse({ ...baseItem, lede: "x".repeat(321) }),
  );
  assert.throws(() =>
    PackSchema.parse({
      beat_id: "b_4a0bab7a98f9",
      beat_label: "ECB monetary policy",
      computed_at: "2026-09-10T08:00:00Z",
      freshness_slo_minutes: 90,
      cursor: "c",
      moved: true,
      item_count: 9,
      items: Array(9).fill(baseItem),
      token_estimate: 100,
      receipt_id: "r_3",
    }),
  );
});

test("phase 5 enrichment fields are optional and additive", () => {
  const enriched = ItemSchema.parse({
    ...baseItem,
    summary: "ECB holds; guidance unchanged.",
    importance: 87,
    signal_types: ["monetary_policy"],
    tickers: ["EUR=X"],
    narrative_id: "nar_9",
    audience_briefs: { trader: "EUR flat on hold." },
  });
  assert.equal(enriched.importance, 87);
  assert.deepEqual(enriched.tickers, ["EUR=X"]);
});
