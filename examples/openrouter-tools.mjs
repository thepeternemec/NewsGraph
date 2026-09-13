// No model key needed to load schemas or execute news calls. A model request
// to OpenRouter needs the application's own OPENROUTER_API_KEY.
export async function loadNewsTools(baseUrl) {
    const response = await fetch(`${baseUrl}/v2/tools`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok)
        throw new Error(`News tool discovery failed: ${response.status}`);
    return (await response.json()).tools;
}
export async function executeNewsTool(baseUrl, call) {
    const args = JSON.parse(call.function.arguments);
    const name = call.function.name;
    const paths = { pleiades_topics: "topics", pleiades_news: "news", pleiades_changes: "changes" };
    if (!Object.hasOwn(paths, name))
        throw new Error(`Unknown news tool: ${name}`);
    if (name !== "pleiades_topics" && typeof args.beat_id !== "string")
        throw new Error("beat_id is required");
    if (name === "pleiades_changes" && typeof args.cursor !== "string")
        throw new Error("cursor is required");
    const query = new URLSearchParams(name === "pleiades_topics" ? { q: args.query ?? "" } : { beat_id: args.beat_id, ...(args.cursor ? { cursor: args.cursor } : {}) });
    const response = await fetch(`${baseUrl}/v2/${paths[name]}?${query}`, { signal: AbortSignal.timeout(20000) });
    const content = await response.text();
    return { role: "tool", tool_call_id: call.id, content: response.ok ? content : JSON.stringify({ error: "news_request_failed", status: response.status, detail: content }) };
}
