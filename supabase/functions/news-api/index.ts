import { Hono } from "npm:hono@4.12.8";
import { newsRoutes } from "../_shared/api/news-routes.ts";
import { mcpResponse } from "../_shared/api/mcp.ts";

// Separate deployment: serves only read-only news interfaces.
// The existing api function and all legacy routes remain independent.
const app = new Hono();
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, MCP-Protocol-Version, MCP-Session-Id");
  if (c.req.method === "OPTIONS") return c.body(null, 204);
  await next();
});
app.get("/health", c => c.json({ ok: true, service: "pleiades-news", version: "0.3.0" }));
app.route("/v2", newsRoutes);
app.all("/mcp", c => mcpResponse(c.req.raw));
Deno.serve(req => {
  const url = new URL(req.url);
  if (url.pathname === "/news-api") url.pathname = "/";
  else if (url.pathname.startsWith("/news-api/")) url.pathname = url.pathname.slice(9);
  return app.fetch(new Request(url, req));
});
