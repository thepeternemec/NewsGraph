/**
 * The API must serve every route the documentation advertises.
 *
 * `/v2/brief` shipped without appearing in the agent guide, and the guide's
 * endpoint table is what an integrator builds against. A route that exists but
 * is undocumented is nearly as bad as one that is documented and missing.
 *
 * This asserts against the Hono app itself, so it needs no database and no
 * network — the routers are constructed at import time and matched on request.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../index.js";

/** Exactly what AGENTS.md and llms.txt tell a client it can call. */
const DOCUMENTED = [
  "/health",
  "/v2/topics",
  "/v2/news",
  "/v2/changes",
  "/v2/brief",
  "/v2/tools",
  "/mcp",
];

const served = () =>
  app.routes.map((route) => ({
    method: route.method,
    path: route.path,
  }));

test("every documented route is served", () => {
  const routes = served();
  for (const documented of DOCUMENTED) {
    assert.ok(
      routes.some((r) => r.path === documented),
      `${documented} is documented but not mounted; mounted: ${routes.map((r) => r.path).join(", ")}`,
    );
  }
});

test("the catalog routes are read-only GETs", () => {
  // The public contract is read-only. A mutating verb appearing here would be a
  // product change, not a refactor.
  for (const route of served()) {
    if (route.path.startsWith("/v2/")) {
      assert.equal(route.method, "GET", `${route.path} is served as ${route.method}`);
    }
  }
});
