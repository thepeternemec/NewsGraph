#!/usr/bin/env node
/**
 * Sync canonical Node sources into supabase/functions/_shared for Deno.
 *
 * Single source of truth: packages/contracts + apps/{api,worker}/src.
 * The generated files under supabase/functions/_shared/ are committed so the
 * functions are deployable without running this script, but any change to the
 * canonical sources must be followed by:
 *
 *   npm run sync:supabase
 *
 * CI enforces freshness with: npm run sync:supabase -- --check
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHARED = join(ROOT, "supabase", "functions", "_shared");
const HEADER = `// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

`;
/** [source, target] pairs plus per-file rewrite rules. */
const COPIES = [
    { src: "apps/worker/src/ingest-news.ts", dst: "worker/ingest-news.ts", rewrite: [['from "@pleiades/db"', 'from "../db/index.ts"'], ['from "./newsapi.js"', 'from "./newsapi.ts"']] },
    { src: "packages/contracts/src/news.ts", dst: "contracts/news.ts", rewrite: [['from "zod"', 'from "npm:zod@3.25.76"'], [/from "(\.[^"]+)\.js"/g, 'from "$1.ts"']] },
    ...["news", "news-routes", "mcp"].map(name => ({ src: `apps/api/src/lib/${name}.ts`, dst: `api/${name}.ts`, rewrite: [
            ['from "hono"', 'from "npm:hono@4.12.8"'], ['from "zod"', 'from "npm:zod@3.25.76"'],
            ['from "@pleiades/db"', 'from "../db/index.ts"'], ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
            [/from "@modelcontextprotocol\/sdk\//g, 'from "npm:@modelcontextprotocol/sdk@1.30.0/'],
            [/from "(\.[^"]+)\.js"/g, 'from "$1.ts"'],
        ] })),
    // contracts (schemas + seed + tools + errors)
    {
        src: "packages/contracts/src/beats.ts",
        dst: "contracts/beats.ts",
        rewrite: [['from "zod"', 'from "npm:zod@^3.24.1"']],
    },
    {
        src: "packages/contracts/src/packs.ts",
        dst: "contracts/packs.ts",
        rewrite: [['from "zod"', 'from "npm:zod@^3.24.1"'], [/from "(\.[^"]+)\.js"/g, 'from "$1.ts"']],
    },
    {
        src: "packages/contracts/src/receipts.ts",
        dst: "contracts/receipts.ts",
        rewrite: [['from "zod"', 'from "npm:zod@^3.24.1"']],
    },
    {
        src: "packages/contracts/src/errors.ts",
        dst: "contracts/errors.ts",
        rewrite: [],
    },
    {
        src: "packages/contracts/src/tools.ts",
        dst: "contracts/tools.ts",
        rewrite: [],
    },
    {
        src: "packages/contracts/src/seed.ts",
        dst: "contracts/seed.ts",
        rewrite: [[/from "(\.[^"]+)\.js"/g, 'from "$1.ts"']],
    },
    {
        src: "packages/contracts/src/index.ts",
        dst: "contracts/index.ts",
        rewrite: [
            [/from "(\.[^"]+)\.js"/g, 'from "$1.ts"'],
            [/export \* from "(\.[^"]+)\.js"/g, 'export * from "$1.ts"'],
        ],
    },
    {
        src: "packages/contracts/src/webhooks.ts",
        dst: "contracts/webhooks.ts",
        rewrite: [
            ['from "zod"', 'from "npm:zod@^3.24.1"'],
            [/from "(\.[^"]+)\.js"/g, 'from "$1.ts"'],
        ],
    },
    // API app + libs
    {
        src: "apps/api/src/index.ts",
        dst: "api/app.ts",
        rewrite: [
            ['from "hono"', 'from "npm:hono@^4.6.14"'],
            ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
            ['from "@pleiades/db"', 'from "../db/index.ts"'],
            ['from "./lib/errors.js"', 'from "./errors.ts"'],
            ['from "./lib/openapi.js"', 'from "./openapi.ts"'],
            ['from "./lib/store.js"', 'from "./store.ts"'],
            ['from "./lib/news-routes.js"', 'from "./news-routes.ts"'],
            ['from "./lib/mcp.js"', 'from "./mcp.ts"'],
        ],
    },
    {
        src: "apps/api/src/lib/errors.ts",
        dst: "api/errors.ts",
        rewrite: [
            ['from "hono"', 'from "npm:hono@^4.6.14"'],
            ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
        ],
    },
    {
        src: "apps/api/src/lib/openapi.ts",
        dst: "api/openapi.ts",
        rewrite: [],
    },
    {
        src: "apps/api/src/lib/store.ts",
        dst: "api/store.ts",
        rewrite: [
            ['from "@pleiades/db"', 'from "../db/index.ts"'],
            ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
        ],
    },
    // DB access layer
    {
        src: "packages/db/src/client.ts",
        dst: "db/client.ts",
        rewrite: [
            ['from "@supabase/supabase-js"', 'from "npm:@supabase/supabase-js@^2.45.4"'],
        ],
    },
    {
        src: "packages/db/src/queries.ts",
        dst: "db/queries.ts",
        rewrite: [
            ['from "@supabase/supabase-js"', 'from "npm:@supabase/supabase-js@^2.45.4"'],
            ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
        ],
    },
    {
        src: "packages/db/src/index.ts",
        dst: "db/index.ts",
        rewrite: [
            [/from "(\.[^"]+)\.js"/g, 'from "$1.ts"'],
            [/export \* from "(\.[^"]+)\.js"/g, 'export * from "$1.ts"'],
        ],
    },
    // Worker: provider client + pack builder
    {
        src: "apps/worker/src/newsapi.ts",
        dst: "worker/newsapi.ts",
        rewrite: [['from "zod"', 'from "npm:zod@^3.24.1"']],
    },
    {
        src: "apps/worker/src/pack.ts",
        dst: "worker/pack.ts",
        rewrite: [
            ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
            ['from "./newsapi.js"', 'from "./newsapi.ts"'],
            ['from "./events.js"', 'from "./events.ts"'],
        ],
    },
    {
        src: "apps/worker/src/persist.ts",
        dst: "worker/persist.ts",
        rewrite: [
            ['from "@supabase/supabase-js"', 'from "npm:@supabase/supabase-js@^2.45.4"'],
            ['from "@pleiades/db"', 'from "../db/index.ts"'],
            ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
            [/from "\.\/newsapi\.js"/g, 'from "./newsapi.ts"'],
        ],
    },
    {
        src: "apps/worker/src/deliver.ts",
        dst: "worker/deliver.ts",
        rewrite: [
            ['from "@supabase/supabase-js"', 'from "npm:@supabase/supabase-js@^2.45.4"'],
            ['from "@pleiades/contracts"', 'from "../contracts/index.ts"'],
            ['from "@pleiades/db"', 'from "../db/index.ts"'],
        ],
    },
];
function transform(content, rules) {
    let out = content;
    // Rules are [pattern, replacement] pairs.
    for (const [pattern, replacement] of rules) {
        out = out.replace(pattern, replacement);
    }
    return out;
}
let failures = 0;
for (const { src, dst, rewrite } of COPIES) {
    const source = join(ROOT, src);
    const target = join(SHARED, dst);
    const generated = HEADER + transform(readFileSync(source, "utf8"), rewrite);
    if (process.argv.includes("--check")) {
        let existing = "";
        try {
            existing = readFileSync(target, "utf8");
        }
        catch {
            /* missing = drift */
        }
        if (existing !== generated) {
            failures += 1;
            console.error(`DRIFT: supabase/functions/_shared/${dst} is out of date. Run: npm run sync:supabase`);
        }
    }
    else {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, generated);
        console.log(`synced ${relative(ROOT, target)}`);
    }
}
if (failures > 0) {
    process.exit(1);
}
if (process.argv.includes("--check")) {
    console.log("supabase/_shared is in sync with canonical sources.");
}
