import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const architecture = readFileSync(
  fileURLToPath(new URL("../../../docs/ARCHITECTURE.md", import.meta.url)),
  "utf8",
);

// docs/ARCHITECTURE.md was rewritten when the repo went from nine packages and
// two APIs down to two packages and one API. These guards keep it describing the
// layout that actually exists, so the docs cannot silently drift back to the
// pre-simplification system.
const REQUIRED = [
  "One Next.js deployment on Vercel, one Postgres, one provider",
  "packages/contracts",
  "packages/db",
  "db/schema.sql",
  "apps/api",
  "apps/worker",
  "client → /api/v2/news",
  "Postgres",
];

const FORBIDDEN = [
  "/v1/poll",
  "/v1/delta",
  "packages/sdk",
  "packages/realtime",
  "apps/bots",
  "ledger",
  "x402",
  "supabase/functions",
];

test("ARCHITECTURE.md describes the current simplified system", () => {
  for (const needle of REQUIRED) {
    assert.ok(architecture.includes(needle), `expected doc to mention ${needle}`);
  }
});

test("ARCHITECTURE.md no longer describes the pre-simplification system", () => {
  for (const needle of FORBIDDEN) {
    assert.equal(
      architecture.includes(needle),
      false,
      `doc must not mention removed layout term ${needle}`,
    );
  }
});