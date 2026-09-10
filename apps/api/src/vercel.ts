import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./index.js";

/**
 * Vercel function entrypoint (@vercel/node).
 *
 * Explicitly buffers the incoming body before dispatching to Hono. The
 * @hono/node-server/vercel `handle` adapter streams the body, which hangs
 * under the @vercel/node builder for any route that reads it (c.req.json()).
 * Buffering here is deterministic and keeps the Hono app unchanged.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks);

  const url = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else headers.append(key, value);
  }

  const webReq = new Request(url.toString(), {
    method: req.method ?? "GET",
    headers,
    body: body.length > 0 ? body : undefined,
  });

  const webRes = await app.fetch(webReq);
  res.statusCode = webRes.status;
  for (const [key, value] of webRes.headers) {
    res.setHeader(key, value);
  }
  res.end(Buffer.from(await webRes.arrayBuffer()));
}
