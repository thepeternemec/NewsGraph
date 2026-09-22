/**
 * Story clustering.
 *
 * Ingestion writes articles. Nothing turned them into events, so a topic with 96
 * articles in a day looked like 96 things happening. Most of them are one thing,
 * reported by 96 outlets — eleven headlines about the same court ruling, three
 * about the same parade. An agent asking "has this moved?" wants the events, not
 * the coverage.
 *
 * This groups near-identical headlines and reports how many publishers carried
 * each. It does not summarise, rewrite or infer anything: the lead of a story is
 * a publisher's own headline, chosen because it was first. That keeps the rule
 * the rest of the product runs on — we cite, we do not paraphrase.
 *
 * Deliberately not an LLM. Similarity is token overlap, so grouping is
 * deterministic, free, instant, and testable. A model would be slower, cost
 * money per article, and be wrong in ways nobody could reproduce.
 */

/** Words that carry no signal about which event a headline describes. */
const STOPWORDS = new Set(
  `a an the and or but for with from into over after before as at by in of on to up is are was
   were be been being it its this that these those has have had will would can could may might
   new says said report reports stock stocks shares share why what how who when where you your
   we our they their his her not no more most about than then them there here out off own same
   so some such only just also very amid as`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Content words, lowercased.
 *
 * Numbers are kept at any length. A length rule of "more than two characters"
 * silently dropped `32` and the `1` and `8` of `$1.8` — the very tokens that
 * distinguish one earnings story from another, and the ones a length filter
 * cannot tell apart from noise.
 */
export function tokens(headline: string): Set<string> {
  return new Set(
    headline
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => (w.length > 2 || /^\d+$/.test(w)) && !STOPWORDS.has(w)),
  );
}

/**
 * Overlap as a share of the *shorter* headline.
 *
 * Jaccard divides by the union, so a short headline and a long one describing the
 * same event score low purely because one is long — a 6-word breaking-news line
 * and a 20-word analysis of the same ruling would never merge. Dividing by the
 * smaller set asks the question that matters: is everything the short one said
 * also in the long one?
 */
export function containment(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

/**
 * How alike two headlines must be to count as one event.
 *
 * 0.5, tuned on forty real SPCX headlines: it merged eleven verbatim reports of
 * one court ruling and left genuinely distinct stories apart. Lowering it to 0.4
 * produced the same grouping on that sample and additionally merged a
 * differently-worded report of the same ruling — which sounds like a win until
 * you consider the failure modes are not symmetric. A missed merge shows one
 * story twice; a false merge *loses a story*, and the reader never learns it
 * existed. The threshold is set to prefer the recoverable mistake.
 */
export const STORY_THRESHOLD = 0.5;

export interface Clusterable {
  title: string;
  source: string;
  published_at: string;
  url: string;
  id: string;
}

export interface Story<T extends Clusterable = Clusterable> {
  /** The earliest headline for the event — a publisher's words, not ours. */
  lead: string;
  /** Publisher names that carried it. */
  sources: string[];
  source_count: number;
  first_seen: string;
  last_seen: string;
  articles: T[];
}

/**
 * Group articles into stories, greedily and in order.
 *
 * Each article joins the first story it sufficiently resembles, or starts one.
 * Comparison is against the story's *lead* rather than a growing union of
 * everything in it: with a union, a story that has absorbed ten variations
 * becomes a token soup that matches anything.
 */
export function clusterStories<T extends Clusterable>(articles: T[]): Array<Story<T>> {
  const stories: Array<{ key: Set<string>; story: Story<T> }> = [];

  for (const article of articles) {
    const key = tokens(article.title);
    let joined = false;

    for (const candidate of stories) {
      if (containment(key, candidate.key) >= STORY_THRESHOLD) {
        candidate.story.articles.push(article);
        if (!candidate.story.sources.includes(article.source)) {
          candidate.story.sources.push(article.source);
        }
        candidate.story.source_count = candidate.story.sources.length;
        if (article.published_at < candidate.story.first_seen) candidate.story.first_seen = article.published_at;
        if (article.published_at > candidate.story.last_seen) candidate.story.last_seen = article.published_at;
        joined = true;
        break;
      }
    }

    if (!joined) {
      stories.push({
        key,
        story: {
          lead: article.title,
          sources: [article.source],
          source_count: 1,
          first_seen: article.published_at,
          last_seen: article.published_at,
          articles: [article],
        },
      });
    }
  }

  // Most-corroborated first: a story eleven publishers carried is more likely to
  // be the thing that actually happened than one that appeared once.
  return stories
    .map((s) => s.story)
    .sort((a, b) => b.source_count - a.source_count || b.last_seen.localeCompare(a.last_seen));
}
