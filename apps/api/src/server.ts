import { serve } from "@hono/node-server";
import app from "./index.js";

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
  console.log(`[pleiades-api] listening on http://localhost:${info.port}`);
});
