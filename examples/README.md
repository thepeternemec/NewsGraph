# Pleiades connections

Build with `npm ci && npm run build:packages && npm run build -w pleiades-api`.

Run `PLEIADES_API_BASE_URL=https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api node examples/verify-integrations.mjs` to verify:

1. The TypeScript client: topic discovery, latest coverage, and changes.
2. The OpenRouter-compatible adapter: schemas, execution, and a model-compatible tool result. This does not run paid model inference or certify an OpenRouter app.
3. Hosted MCP using the official MCP client: initialization, tools/list, and tools/call.

For an actual model loop, set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to a currently available tool-capable model, then run `node examples/openrouter-agent.mjs "What is new with Nvidia?"`. The loop is bounded to five model requests, with at most five tool calls per response. These model requests incur your normal provider charges.

The workspace SDK is not yet published to npm. Use it from this repository. MCP clients can connect without installing this SDK; add the remote URL ending in `/mcp`.

Test each agent host separately before claiming host-specific compatibility. The protocol check is not evidence of an installation in Claude, Cursor, or Codex.
