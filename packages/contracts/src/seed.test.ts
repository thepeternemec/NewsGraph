import assert from "node:assert/strict";
import { test } from "node:test";
import { BeatSchema, SEED_BEATS, BEAT_ID_PATTERN } from "./index.js";

test("the catalog is warm and well-formed", () => {
  assert.ok(SEED_BEATS.length >= 100, "expected the full catalog");
  for (const beat of SEED_BEATS) {
    assert.equal(beat.state, "warm");
    assert.match(beat.beat_id, BEAT_ID_PATTERN);
  }
});

test("every beat parses, with unique ids and no duplicate assets", () => {
  // A ticker may repeat, but only across asset classes: Sui and Sun Communities
  // are both SUI, and the coin is labelled "(crypto)" to say which it is. Two
  // entries with the same ticker and no such marker is the accident this
  // catches — the same company added twice, which happened twice while the
  // catalog was being assembled.
  const ids = new Set<string>();
  const tickers = new Map<string, (typeof SEED_BEATS)[number]>();
  for (const beat of SEED_BEATS) {
    assert.deepEqual(BeatSchema.parse(beat), beat);
    assert.ok(!ids.has(beat.beat_id), `duplicate beat id ${beat.beat_id}`);
    ids.add(beat.beat_id);

    const previous = tickers.get(beat.ticker);
    if (previous !== undefined) {
      const distinct = previous.asset !== beat.asset;
      assert.ok(distinct, `duplicate ticker ${beat.ticker}: "${previous.label}" and "${beat.label}"`);
    }
    tickers.set(beat.ticker, beat);
  }
});

test("every beat is English-only", () => {
  for (const beat of SEED_BEATS) {
    assert.deepEqual(beat.languages, ["eng"], `${beat.ticker} is not English-only`);
  }
});

test("no keyword is a bare short ticker", () => {
  // The failure this guards against is real and expensive: "S" (SentinelOne)
  // matches any headline containing the letter, "NOW" (ServiceNow) matches the
  // word "now", "OP" (Optimism) matches "Op-Ed". Every keyword has to be
  // distinctive enough to mean the asset and nothing else.
  const banned = new Set(["S", "F", "W", "OP", "OM", "NOW", "NOT", "CORE", "TRU", "DK", "GM", "MU", "TER", "FIL", "GRT"]);
  // Two deliberate exceptions, each paired with a distinctive name so the
  // generic word alone is never the only way a story can match.
  const excepted = new Map([["NOT", "Notcoin"], ["CORE", "Core"]]);
  for (const beat of SEED_BEATS) {
    for (const keyword of beat.keywords) {
      const upper = keyword.toUpperCase();
      if (banned.has(upper) && excepted.get(upper) !== beat.label) {
        assert.fail(`${beat.ticker}: keyword "${keyword}" is too generic to match on`);
      }
      if (banned.has(upper)) {
        assert.ok(beat.keywords.length > 1, `${beat.ticker}: a generic keyword needs a distinctive partner`);
      }
      // Two characters is a real exchange symbol — RH, BP, GE. One character is
      // not, and the genuinely ambiguous short words are named in `banned`.
      assert.ok(keyword.trim().length >= 2, `${beat.ticker}: keyword "${keyword}" is too short`);
    }
  }
});

test("beat ids are stable for the tickers already in use", () => {
  const nvidia = SEED_BEATS.find((b) => b.ticker === "NVDA");
  assert.ok(nvidia, "expected NVDA in the catalog");
  assert.equal(nvidia?.beat_id, "b_bb964843350e", "NVDA keeps its original id so stored cursors survive");
});

test("the catalog holds both asset classes", () => {
  const tickers = new Set(SEED_BEATS.map((b) => b.ticker));
  const crypto = SEED_BEATS.filter((b) => b.asset === "crypto");

  for (const t of ["NVDA", "TSM", "TSLA", "AAPL", "MSFT"]) {
    assert.ok(tickers.has(t), `expected the equity ${t}`);
  }
  for (const t of ["BTC", "ETH", "SOL", "DOGE"]) {
    assert.ok(tickers.has(t), `expected the crypto asset ${t}`);
  }

  // Crypto was removed once and restored on purpose. This asserts the restored
  // shape rather than the presence of any one coin: a catalog that silently
  // loses the crypto half is the same failure in the other direction.
  assert.ok(crypto.length >= 90, `expected ~100 crypto topics, found ${crypto.length}`);
  assert.ok(SEED_BEATS.length > 1000, `expected a catalog past 1000 topics, found ${SEED_BEATS.length}`);
});
