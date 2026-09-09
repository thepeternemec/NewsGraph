import assert from "node:assert/strict";
import { test } from "node:test";
import { BeatSchema, SEED_BEATS, BEAT_ID_PATTERN } from "./index.js";

test("seed catalog contains 20 warm beats", () => {
  assert.equal(SEED_BEATS.length, 20);
  for (const beat of SEED_BEATS) {
    assert.equal(beat.state, "warm");
    assert.match(beat.beat_id, BEAT_ID_PATTERN);
  }
});

test("every seed beat parses against the canonical schema", () => {
  const ids = new Set<string>();
  for (const beat of SEED_BEATS) {
    const parsed = BeatSchema.parse(beat);
    assert.deepEqual(parsed, beat);
    assert.ok(!ids.has(beat.beat_id), `duplicate beat id ${beat.beat_id}`);
    ids.add(beat.beat_id);
  }
});

test("every seed concept URI is a newsapi.ai-style Wikipedia concept", () => {
  for (const beat of SEED_BEATS) {
    assert.ok(beat.concept_uris.length >= 1, beat.beat_id);
    for (const uri of beat.concept_uris) {
      assert.ok(
        uri.startsWith("http://en.wikipedia.org/wiki/"),
        `${beat.beat_id}: ${uri}`,
      );
    }
  }
});

test("beat ids are unique and stable (legacy v0.1 identifiers preserved)", () => {
  const known = [
    "b_e857ee04eb3f", // African Continental Free Trade Area
    "b_4a0bab7a98f9", // ECB monetary policy
    "b_dab9c000dca5", // EU AI Act
    "b_bb964843350e", // NVIDIA
    "b_223175e1243e", // Taiwan semiconductors
  ];
  for (const id of known) {
    assert.ok(
      SEED_BEATS.some((b) => b.beat_id === id),
      `expected legacy beat ${id} in seed catalog`,
    );
  }
});
