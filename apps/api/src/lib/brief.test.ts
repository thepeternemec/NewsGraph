import assert from "node:assert/strict";
import { test } from "node:test";
import { renderBrief, type BriefItem } from "./news.js";

const item = (n: number): BriefItem => ({
  lede: `Something specific happened number ${n}, stated by the publisher.`,
  source: n === 1 ? "Reuters" : "Bloomberg",
  url: `https://example.com/${n}`,
  published_at: `2026-09-18T0${n}:41:00.000Z`,
  first_indexed_at: `2026-09-18T0${n}:43:00.000Z`,
});

test("every lede appears verbatim in the brief", () => {
  const items = [item(1), item(2), item(3)];
  const text = renderBrief("NVIDIA", items);
  for (const i of items) {
    assert.ok(text.includes(i.lede), `lede missing from brief: ${i.lede}`);
  }
});

test("the brief adds no words of its own", () => {
  // The rule is that a brief cites rather than summarises. Anything in the
  // output that is not a lede, a publisher, a timestamp or a count means
  // someone started writing prose, and a written brief can be wrong.
  const items = [item(1)];
  const text = renderBrief("NVIDIA", items);
  const allowed = [items[0]!.lede, items[0]!.source, "NVIDIA", "1", "story", "01:41Z"];
  const stripped = text;
  for (const token of allowed) {
    assert.ok(stripped.includes(token), `expected the brief to contain ${token}`);
  }
  // Nothing beyond a label line and one numbered item.
  assert.equal(text.split("\n").length, 2);
});

test("an empty brief says so plainly rather than inventing one", () => {
  const text = renderBrief("NVIDIA", []);
  assert.equal(text, "NVIDIA — nothing moved.");
});

test("the count agrees with the items", () => {
  assert.ok(renderBrief("NVIDIA", [item(1)]).includes("1 story"));
  assert.ok(renderBrief("NVIDIA", [item(1), item(2)]).includes("2 stories"));
});

test("a brief is numbered in the order it was given", () => {
  const text = renderBrief("NVIDIA", [item(1), item(2), item(3)]);
  assert.ok(text.indexOf("1. ") < text.indexOf("2. "));
  assert.ok(text.indexOf("2. ") < text.indexOf("3. "));
});
