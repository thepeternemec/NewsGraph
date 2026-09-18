#!/usr/bin/env node
/**
 * Issue an API key.
 *
 *   DATABASE_URL="postgres://…" npm run key:issue -- "acme desk"
 *
 * The secret is printed once. Only its SHA-256 is stored, so it cannot be
 * recovered — issue another if it is lost. A key does not unlock anything that
 * is otherwise closed; it raises the rate limit.
 */
import postgres from "postgres";
import { createKey } from "../packages/db/dist/keys.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("missing DATABASE_URL");
  process.exit(2);
}
const label = process.argv.slice(2).join(" ").trim() || "unnamed";

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  const secret = await createKey(sql, label);
  console.log(`\n  label   ${label}`);
  console.log(`  api key ${secret}\n`);
  console.log("  Store it now: only its hash is written, so it cannot be shown again.");
  console.log("  Use it as:  Authorization: Bearer <key>\n");
} catch (error) {
  console.error("could not issue key:", error.message);
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
