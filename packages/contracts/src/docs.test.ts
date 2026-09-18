/**
 * Docs drift guards.
 *
 * Every stale claim found on 2026-09-18 was wrong for weeks and broke no test:
 * the catalog said four topics three catalogs after it grew, the landing sold a
 * price card while /pricing said none existed, and a documented field was always
 * empty because the provider stopped returning it. None of that is a code error,
 * so nothing failed — the docs simply stopped being true.
 *
 * These tests assert claims against the code. They cannot check prose, but they
 * can check the things prose is most likely to get wrong: a count, a list, and a
 * field somebody is told to read.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { SEED_BEATS, NEWS_TOOLS } from "./index.js";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const ROOT = "../../../";

const agents = read(`${ROOT}AGENTS.md`);
const status = read(`${ROOT}docs/STATUS.md`);
const readme = read(`${ROOT}README.md`);

/** Every doc that states the size of the catalog. */
const COUNT_SOURCES: Array<[string, string, RegExp]> = [
  ["AGENTS.md", agents, /\*\*(\d+) topics\*\*/],
  ["docs/STATUS.md", status, /\*\*(\d+) topics\*\*/],
];

test("every stated catalog size matches the catalog", () => {
  for (const [name, text, pattern] of COUNT_SOURCES) {
    const match = text.match(pattern);
    assert.ok(match, `${name} no longer states a catalog size — update this test if that is deliberate`);
    assert.equal(
      Number(match[1]),
      SEED_BEATS.length,
      `${name} says ${match[1]} topics, the catalog has ${SEED_BEATS.length}`,
    );
  }
});

test("the docs name the tools, and every tool they name exists", () => {
  // This started as a one-way check and was vacuous: no doc mentioned a tool at
  // all, so the loop never ran and the guard could not fail. It now asserts both
  // directions — an agent guide that names no tools is as broken as one that
  // names a tool the server does not have.
  const defined = new Set<string>(NEWS_TOOLS.map((t) => t.name));
  const seen = new Set<string>();
  for (const [name, text] of [["AGENTS.md", agents], ["README.md", readme], ["docs/STATUS.md", status]] as const) {
    for (const mentioned of text.match(/newsgraph_[a-z_]+/g) ?? []) {
      seen.add(mentioned);
      assert.ok(defined.has(mentioned), `${name} mentions ${mentioned}, which is not a defined tool`);
    }
  }
  assert.ok(seen.size > 0, "no doc names a single tool — the agent guide should list them");
  for (const tool of defined) {
    assert.ok(seen.has(tool), `${tool} exists but no doc tells an agent to call it`);
  }
});

test("no doc describes the pre-Google-News item shape", () => {
  // Google News returns a headline, a link, a publisher and a time. It returns
  // no excerpt and no publisher URL, and both were documented for weeks after
  // the provider changed — the quickstart even showed an "excerpt" field in its
  // example payload that is always empty.
  const FORBIDDEN: Array<[string, RegExp]> = [
    ["a publisher URL", /publisher('s)? URL/i],
    ["an excerpt", /\bexcerpt\b/i],
    ["capped ledes", /ledes? capped/i],
  ];
  for (const [name, text] of [["AGENTS.md", agents], ["docs/STATUS.md", status], ["README.md", readme]] as const) {
    for (const [what, pattern] of FORBIDDEN) {
      assert.equal(pattern.test(text), false, `${name} still describes ${what}, which the API does not return`);
    }
  }
});

test("no doc still describes a catalog of four topics", () => {
  // The specific drift that started this: the catalog went 4 -> 148 -> 540 and
  // the docs kept naming NVIDIA, Bitcoin, Tesla and the oil price.
  for (const [name, text] of [["AGENTS.md", agents], ["docs/STATUS.md", status], ["README.md", readme]] as const) {
    assert.equal(/\bfour topics\b/i.test(text), false, `${name} still says four topics`);
    assert.equal(
      /NVIDIA, Bitcoin, Tesla/.test(text),
      false,
      `${name} still lists the four-topic catalog`,
    );
  }
});

test("the catalog is equity-only while crypto is out", () => {
  const tickers = SEED_BEATS.map((b) => b.ticker);
  assert.ok(tickers.length > 300, `expected the full US catalog, got ${tickers.length}`);
  for (const crypto of ["BTC", "ETH", "SOL", "DOGE"]) {
    assert.equal(tickers.includes(crypto), false, `${crypto} is crypto; the catalog is equity-only`);
  }
});
