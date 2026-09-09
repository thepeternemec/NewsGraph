/**
 * Agent tool definitions (OpenAI function-call shape), mirroring the live
 * v0.1 `/v1/tools` payload under the Pleiades name. Definitions describe
 * calls; they do not execute requests or supply credentials.
 */
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "pleiades_resolve",
      description:
        "Find news beats for a task. Free. POST /v1/resolve. Currently returns 503 resolution_unavailable until the live graph adapter ships.",
      parameters: {
        type: "object",
        properties: {
          task: { type: "string" },
          depth_days: { type: "integer", minimum: 1, maximum: 30 },
        },
        required: ["task"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pleiades_poll",
      description:
        "Check whether a beat moved. POST /v1/poll with X-PAYMENT credential or x402. Keep the returned cursor and receipt_id.",
      parameters: {
        type: "object",
        properties: {
          beat_id: {
            type: "string",
            description: "Stable beat ID returned by resolve or catalog",
          },
          cursor: { type: "string", description: "Signed cursor from a previous response" },
          depth_days: { type: "integer", minimum: 1, maximum: 30 },
        },
        required: ["beat_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pleiades_delta",
      description:
        "Read the next bounded page of new beat items. POST /v1/delta with X-PAYMENT credential or x402. Continue with the returned cursor until moved=false.",
      parameters: {
        type: "object",
        properties: {
          beat_id: { type: "string" },
          cursor: { type: "string" },
          depth_days: { type: "integer", minimum: 1, maximum: 30 },
        },
        required: ["beat_id"],
        additionalProperties: false,
      },
    },
  },
] as const;
