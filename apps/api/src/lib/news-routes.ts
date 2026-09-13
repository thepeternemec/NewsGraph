import { Hono } from "hono";
import { z } from "zod";
import { NEWS_TOOLS } from "@pleiades/contracts";
import { NewsError, topics, newsPage } from "./news.js";
export const newsRoutes = new Hono();
newsRoutes.onError((error, c) => { if (error instanceof NewsError)
    return c.json({ error: { code: error.code, message: error.message } }, error.status as 400 | 404 | 410 | 503); console.error("news request failed", error.name); return c.json({ error: { code: "service_unavailable", message: "News is temporarily unavailable." } }, 503); });
newsRoutes.get("/topics", async (c) => c.json(await topics((c.req.query("q") ?? "").slice(0, 200))));
newsRoutes.get("/news", async (c) => c.json(await newsPage(c.req.query("beat_id") ?? "", c.req.query("before"), !!c.req.query("before"))));
newsRoutes.get("/changes", async (c) => { const cursor = c.req.query("cursor"); if (!cursor)
    throw new NewsError("missing_cursor", "Read latest news first and save its cursor."); return c.json(await newsPage(c.req.query("beat_id") ?? "", cursor)); });
newsRoutes.get("/tools", c => c.json({ tools: NEWS_TOOLS.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })) }));
export async function callNewsTool(name: string, args: unknown) {
    if (name === "pleiades_topics") {
        const input = z.object({ query: z.string().max(200).optional() }).strict().parse(args);
        return topics(input.query);
    }
    if (name === "pleiades_news") {
        const input = z.object({ beat_id: z.string() }).strict().parse(args);
        return newsPage(input.beat_id);
    }
    if (name === "pleiades_changes") {
        const input = z.object({ beat_id: z.string(), cursor: z.string().max(2048) }).strict().parse(args);
        return newsPage(input.beat_id, input.cursor);
    }
    throw new NewsError("unknown_tool", "Unknown news tool.", 404);
}
