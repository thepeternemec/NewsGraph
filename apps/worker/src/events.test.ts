import assert from "node:assert/strict";
import { test } from "node:test";
import { linkArticlesToEvents } from "./events.js";
import { eventArticleUris } from "./newsapi.js";
import type { ProviderArticle, ProviderEvent } from "./newsapi.js";

const article = (uri: string, source: string): ProviderArticle => ({
  uri,
  title: `T-${uri}`,
  body: "",
  source: { title: source },
});

test("maps article URIs to events via both membership field shapes", () => {
  const articles = [article("a1", "Reuters"), article("a2", "Bloomberg"), article("a3", "AP")];
  const events: ProviderEvent[] = [
    { uri: "evt-1", articles: [{ uri: "a1" }, { uri: "a2" }] },
    { uri: "evt-2", articleUris: ["a3"] },
  ];
  const { eventUriByArticle, corroborationByEvent } = linkArticlesToEvents(articles, events);
  assert.equal(eventUriByArticle.get("a1"), "evt-1");
  assert.equal(eventUriByArticle.get("a2"), "evt-1");
  assert.equal(eventUriByArticle.get("a3"), "evt-2");
  assert.equal(corroborationByEvent.get("evt-1"), 2); // Reuters + Bloomberg
  assert.equal(corroborationByEvent.get("evt-2"), 1);
});

test("unclustered articles get no event and zero corroboration", () => {
  const articles = [article("solo", "AP")];
  const { eventUriByArticle, corroborationByEvent } = linkArticlesToEvents(articles, []);
  assert.equal(eventUriByArticle.get("solo"), undefined);
  assert.equal(corroborationByEvent.size, 0);
});

test("eventArticleUris prefers articles[] and falls back to articleUris", () => {
  assert.deepEqual(eventArticleUris({ uri: "e1", articles: [{ uri: "x" }] }), ["x"]);
  assert.deepEqual(eventArticleUris({ uri: "e2", articleUris: ["y"] }), ["y"]);
  assert.deepEqual(eventArticleUris({ uri: "e3" }), []);
});
