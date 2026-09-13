import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { PleiadesClient } from "../packages/sdk/dist/index.js";
import { loadNewsTools, executeNewsTool } from "./openrouter-tools.mjs";
const base = process.env.PLEIADES_API_BASE_URL ?? "http://127.0.0.1:8787";
const sdk = new PleiadesClient({ baseUrl: base });
const topics = await sdk.topics("NVIDIA");
assert(topics.topics.length);
const beat = topics.topics[0].beat_id;
const latest = await sdk.news(beat);
assert(latest.cursor);
assert(Array.isArray(latest.items));
const next = await sdk.changes(beat, latest.cursor);
assert(next.cursor);
console.log(`PASS TypeScript client: ${latest.items.length} latest articles; freshness=${latest.freshness.status}`);
const tools = await loadNewsTools(base);
assert.equal(tools.length, 3);
const result = await executeNewsTool(base, { id: "verification-call", function: { name: "pleiades_news", arguments: JSON.stringify({ beat_id: beat }) } });
assert.equal(result.role, "tool");
assert(Array.isArray(JSON.parse(result.content).items));
console.log("PASS OpenRouter tool adapter: schemas → execution → model-compatible tool result (no paid model inference)");
const client = new Client({ name: "pleiades-verification", version: "1.0.0" });
try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 3);
    const result = await client.callTool({ name: "pleiades_news", arguments: { beat_id: beat } });
    assert(!result.isError);
    assert(Array.isArray(JSON.parse(result.content[0].text).items));
    console.log("PASS MCP: official client initialized, discovered three tools, called news, received articles");
}
finally {
    await client.close();
}
