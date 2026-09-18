/**
 * NewsGraph API.
 *
 * Read-only news interfaces: topics, articles, changes since a cursor, and an
 * MCP server for agent frameworks. This is the canonical source for the
 * mounted at `/api/*` by the Next app, so the site and the API are one
 * deployment. It also runs standalone on Node via `server.ts`.
 *
 * No credential is required. There is no billing here.
 */

import { Hono } from "hono";
import { newsRoutes } from "./lib/news-routes.js";
import { rateLimit, rateLimits } from "./lib/limit.js";
import { mcpResponse } from "./lib/mcp.js";

const app = new Hono();

app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id",
  );
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});

// Counting happens before routing, so refused requests cost one indexed upsert.
app.use("*", rateLimit);

app.get("/health", (c) => c.json({ ok: true, service: "newsgraph", version: "0.3.0" }));

app.get("/", (c) =>
  c.json({
    service: "NewsGraph",
    docs: "https://newsgraph.vercel.app/docs",
    repo: "https://github.com/thepeternemec/NewsGraph",
    routes: ["/v2/topics", "/v2/news", "/v2/changes", "/v2/tools", "/mcp", "/health"],
    rate_limits: rateLimits,
  }),
);

app.route("/v2", newsRoutes);
app.all("/mcp", (c) => mcpResponse(c.req.raw));

export default app;
