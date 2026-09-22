import assert from "node:assert/strict";
import { test } from "node:test";
import { clusterStories, containment, tokens, type Clusterable } from "./cluster.js";

const a = (title: string, source = "Reuters", published_at = "2026-09-22T10:00:00.000Z"): Clusterable => ({
  id: title.slice(0, 8),
  title,
  source,
  published_at,
  url: "https://example.com",
});

test("the same ruling from different outlets is one story", () => {
  // Verbatim near-duplicates from the real feed, including the apostrophe
  // variation that copy-paste produces — which is what clustering is for.
  const articles = [
    a("Judge won't block Trump administration from giving SpaceX acres of wildlife refuge in launch site deal", "AP"),
    a("Judge won't block Trump administration from giving SpaceX acres of wildlife refuge in launch site deal", "Reuters"),
    a("Judge wont block Trump administration from giving SpaceX acres of wildlife refuge in launch site deal", "The Hill"),
  ];
  const stories = clusterStories(articles);
  assert.equal(stories.length, 1, `expected one story, got ${stories.length}`);
  assert.equal(stories[0]!.source_count, 3);
});

test("a reworded report of the same event stays separate, on purpose", () => {
  // A real limitation, asserted so it is visible rather than discovered. Sharing
  // four content words out of ten scores 0.4 and does not merge. Lowering the
  // threshold to catch it also merges unrelated stories, and a false merge *loses*
  // a story while a missed merge only repeats one. See STORY_THRESHOLD.
  const stories = clusterStories([
    a("Judge won't block Trump administration from giving SpaceX acres of wildlife refuge in launch site deal", "AP"),
    a("Federal judge allows SpaceX-wildlife refuge land exchange to move forward", "Bloomberg"),
  ]);
  assert.equal(stories.length, 2, "reworded coverage is not merged at this threshold");
});

test("different events about the same company stay apart", () => {
  const stories = clusterStories([
    a("SpaceX Raptor rocket engines roll down Main Street for McGregor Founders Day parade"),
    a("SpaceX prepares Starship for first ever orbital launch"),
    a("SpaceX is giving away the Starlink Mini to cheaper subscribers"),
    a("Destiny Tech100 jumps 35% as traders chase a backdoor bet on a rumored SpaceX listing"),
  ]);
  assert.equal(stories.length, 4, "four unrelated headlines are four stories");
});

test("a short breaking headline joins a longer report of the same event", () => {
  // Jaccard would never merge these; dividing by the shorter set does.
  const stories = clusterStories([
    a("SpaceX Starship orbital launch succeeds"),
    a("SpaceX Starship orbital launch succeeds after years of delays and a federal review"),
  ]);
  assert.equal(stories.length, 1);
});

test("the lead is the earliest headline, not ours", () => {
  const stories = clusterStories([
    a("Judge won't block Trump administration from giving SpaceX acres of wildlife refuge", "AP", "2026-09-22T12:00:00.000Z"),
    a("Judge won't block Trump administration from giving SpaceX acres of wildlife refuge", "Reuters", "2026-09-22T09:00:00.000Z"),
  ]);
  assert.equal(stories[0]!.lead, "Judge won't block Trump administration from giving SpaceX acres of wildlife refuge");
  // The lead is the first article *given*, but first_seen tracks the earliest
  // timestamp among them — a story's start is when it was published, not when
  // this code happened to see it.
  assert.equal(stories[0]!.first_seen, "2026-09-22T09:00:00.000Z");
});

test("stories are ordered by how many publishers carried them", () => {
  const stories = clusterStories([
    a("A quiet thing happened at SpaceX once", "Blog"),
    a("SpaceX Falcon 9 grounded by the FAA pending an investigation", "AP"),
    a("SpaceX Falcon 9 grounded by the FAA pending an investigation", "Reuters"),
    a("SpaceX Falcon 9 grounded by the FAA pending an investigation", "CNBC"),
  ]);
  assert.equal(stories[0]!.source_count, 3);
  assert.ok(stories[0]!.lead.includes("Falcon 9"));
});

test("a publisher counted once however many times it appears", () => {
  const stories = clusterStories([
    a("SpaceX Falcon 9 grounded by the FAA pending an investigation", "Reuters"),
    a("SpaceX Falcon 9 grounded by the FAA pending an investigation", "Reuters"),
  ]);
  assert.equal(stories[0]!.source_count, 1, "the same outlet twice is not corroboration");
  assert.equal(stories[0]!.articles.length, 2);
});

test("empty input is empty output", () => {
  assert.deepEqual(clusterStories([]), []);
});

test("tokens drop stopwords and punctuation but keep numbers", () => {
  const t = tokens("SpaceX IPO'd at $1.8 Trillion, Crashed 32%");
  assert.ok(t.has("spacex"));
  assert.ok(t.has("trillion"));
  assert.ok(t.has("32"), "a percentage distinguishes one earnings story from another");
  assert.ok(!t.has("at"));
});

test("containment is a share of the shorter headline", () => {
  const short = tokens("SpaceX Starship launch");
  const long = tokens("SpaceX Starship launch happens today after a long federal review");
  assert.equal(containment(short, long), 1, "everything the short one said is in the long one");
  // Symmetric when one set contains the other, which is the point: dividing by
  // the smaller set is exactly what makes a six-word breaking line merge with a
  // twenty-word report of the same event.
  assert.equal(containment(long, short), 1);
});

test("known limitation: an outcome word does not separate two stories", () => {
  // Asserted rather than hidden. "launch succeeds" and "launch aborted" share
  // every token but the verb, so containment scores 0.75 and they merge — the
  // story that was aborted is lost behind the one that succeeded.
  //
  // This is why the metric cannot be the whole answer. The fix is to weight rare
  // tokens above common ones — "spacex" appears in nearly every headline about
  // SpaceX and distinguishes nothing, while "aborted" appears in almost none.
  // Until then the threshold stays where it is, because the failure this metric
  // has in practice is missing merges rather than wrong ones.
  const stories = clusterStories([
    a("SpaceX Starship launch succeeds"),
    a("SpaceX Starship launch aborted at the pad"),
  ]);
  assert.equal(stories.length, 1, "the limitation, stated as a test");
});
