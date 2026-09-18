#!/usr/bin/env node
/**
 * Delete stored articles whose headline does not contain their topic's keyword.
 *
 *   DATABASE_URL="postgres://…" npm run db:prune
 *
 * Ingestion now filters on the headline, but articles stored before that filter
 * existed are still in the table — including ones that match a topic only in
 * passing. Without this, a "brief" for NVIDIA still opens with a film trailer.
 *
 * Destructive and deliberately separate from ingestion: reclaiming space and
 * fixing past precision are different jobs from fetching news.
 */
import postgres from "postgres";
import { SEED_BEATS } from "../packages/contracts/dist/index.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("missing DATABASE_URL");
  process.exit(2);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
let total = 0;
try {
  for (const beat of SEED_BEATS) {
    // Case-insensitive substring match, the same rule ingestion applies. Built
    // as OR'd fragments rather than an array parameter: the driver has no
    // literal syntax for text[] and passing one silently interpolates a column.
    const patterns = beat.keywords.map((k) => `%${k.toLowerCase()}%`);
    const matches = patterns
      .map((pattern) => sql`lower(news_articles.title) like ${pattern}`)
      .reduce((acc, clause) => sql`${acc} or ${clause}`);

    const rows = await sql`
      delete from public.news_articles
      where beat_id = ${beat.beat_id} and not (${matches})
      returning 1`;
    if (rows.length > 5) console.log(`  ${beat.ticker.padEnd(7)} removed ${rows.length}`);
    total += rows.length;
  }

  const [left] = await sql`select count(*)::int as n from public.news_articles`;
  console.log(`\n  removed ${total} mismatched articles; ${left.n} remain\n`);
} catch (error) {
  console.error("prune failed:", error.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
