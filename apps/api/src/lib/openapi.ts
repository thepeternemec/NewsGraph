/**
 * OpenAPI 3.0 document (Phase 0 fix F4). Keep in sync with `src/index.ts`;
 * long-term this should be generated from the route definitions.
 */
export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Pleiades API",
    version: "0.2.0",
    description:
      "Real-time news terminal for agents and humans. Catalog, tools, and pricing are live; metered poll/delta return 503 pack_not_ready until Phase 1 ingestion lands.",
  },
  servers: [{ url: "https://pleiades.news" }, { url: "http://localhost:8787" }],
  paths: {
    "/health": {
      get: {
        operationId: "health",
        responses: { "200": { description: "Service responding" } },
      },
    },
    "/ready": {
      get: {
        operationId: "readiness",
        responses: { "200": { description: "Database check passes" } },
      },
    },
    "/v1/catalog": {
      get: {
        operationId: "listBeats",
        summary: "List warm beats (unmetered)",
        responses: {
          "200": {
            description: "Warm catalog ordered by label",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CatalogResponse" } } },
          },
        },
      },
    },
    "/v1/tools": {
      get: {
        operationId: "toolDefinitions",
        summary: "Agent tool definitions (unmetered)",
        responses: { "200": { description: "Function definitions for agent frameworks" } },
      },
    },
    "/v1/pricing": {
      get: {
        operationId: "pricing",
        summary: "Public price card (unmetered)",
        responses: { "200": { description: "Price card, depth multipliers, caps, deposit rails" } },
      },
    },
    "/v1/resolve": {
      post: {
        operationId: "resolveTask",
        summary: "Map a task to beats (free; 503 until graph adapter lands)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ResolveRequest" } } },
        },
        responses: {
          "200": { description: "Matched beats and unavailable reasons (future)" },
          "503": { description: "resolution_unavailable" },
        },
      },
    },
    "/v1/poll": {
      post: {
        operationId: "pollBeat",
        summary: "Check whether a beat moved (metered once packs exist)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PollRequest" } } },
        },
        responses: {
          "200": { description: "Pack when moved; compact shape when unchanged" },
          "402": { description: "insufficient_balance" },
          "404": { description: "beat_unavailable" },
          "503": { description: "pack_not_ready" },
        },
      },
    },
    "/v1/delta": {
      post: {
        operationId: "deltaBeat",
        summary: "Read the next bounded page of newer items (metered)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PollRequest" } } },
        },
        responses: {
          "200": { description: "Delta page" },
          "402": { description: "insufficient_balance" },
          "404": { description: "beat_unavailable" },
          "503": { description: "pack_not_ready" },
        },
      },
    },
    "/v1/webhooks": {
      post: {
        operationId: "registerWebhook",
        summary: "Register a webhook (HMAC secret returned exactly once)",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/WebhookRegistrationRequest" } } },
        },
        responses: {
          "201": { description: "Registered webhook with secret" },
          "400": { description: "invalid_request" },
          "404": { description: "beat_unavailable" },
          "503": { description: "database_not_configured" },
        },
      },
      get: {
        operationId: "listWebhooks",
        summary: "List registered webhooks (secrets never returned)",
        responses: {
          "200": { description: "Webhook list" },
          "503": { description: "database_not_configured" },
        },
      },
    },
    "/v1/webhooks/{webhook_id}": {
      delete: {
        operationId: "revokeWebhook",
        summary: "Revoke a webhook by id",
        parameters: [{ name: "webhook_id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Revoked" },
          "400": { description: "invalid_request" },
          "503": { description: "database_not_configured" },
        },
      },
    },
  },
  components: {
    schemas: {
      Beat: {
        type: "object",
        required: [
          "beat_id",
          "label",
          "concept_uris",
          "topic_filters",
          "languages",
          "excludes",
          "state",
          "refresh_interval_minutes",
          "freshness_slo_minutes",
        ],
        properties: {
          beat_id: { type: "string", pattern: "^b_[0-9a-f]{12}$" },
          label: { type: "string" },
          concept_uris: { type: "array", items: { type: "string", format: "uri" } },
          topic_filters: { type: "array", items: { type: "string" } },
          languages: { type: "array", items: { type: "string" } },
          excludes: { type: "string" },
          state: { type: "string", enum: ["warm", "cold"] },
          refresh_interval_minutes: { type: "integer" },
          freshness_slo_minutes: { type: "integer" },
        },
      },
      CatalogResponse: {
        type: "object",
        required: ["beats"],
        properties: { beats: { type: "array", items: { $ref: "#/components/schemas/Beat" } } },
      },
      ResolveRequest: {
        type: "object",
        required: ["task"],
        properties: {
          task: { type: "string", maxLength: 2000 },
          depth_days: { type: "integer", minimum: 1, maximum: 30 },
        },
        additionalProperties: false,
      },
      PollRequest: {
        type: "object",
        required: ["beat_id"],
        properties: {
          beat_id: { type: "string", pattern: "^b_[0-9a-f]{12}$" },
          cursor: { type: "string", maxLength: 2048 },
          depth_days: { type: "integer", minimum: 1, maximum: 30 },
        },
        additionalProperties: false,
      },
      WebhookRegistrationRequest: {
        type: "object",
        required: ["url", "beat_ids"],
        properties: {
          url: { type: "string", format: "uri" },
          beat_ids: { type: "array", items: { type: "string", pattern: "^b_[0-9a-f]{12}$" }, minItems: 1, maxItems: 20 },
        },
        additionalProperties: false,
      },
    },
  },
} as const;
