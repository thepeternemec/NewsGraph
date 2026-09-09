import {
  CatalogResponseSchema,
  PollRequestSchema,
  PollResponseSchema,
  WebhookListResponseSchema,
  WebhookRegisteredSchema,
  WebhookRegistrationRequestSchema,
  type CatalogResponse,
  type PollRequest,
  type PollResponse,
  type WebhookListResponse,
  type WebhookRegistered,
  type WebhookRegistrationRequest,
} from "@pleiades/contracts";

export interface PleiadesClientOptions {
  /** API base URL, e.g. https://pleiades.news or http://localhost:8787 */
  baseUrl: string;
  /** Prepaid spending credential (off-chain rail). Omit for unmetered calls. */
  credential?: string;
  /** Optional fetch implementation (test seam). */
  fetch?: typeof fetch;
  /** Idempotency key generator; defaults to crypto.randomUUID(). */
  idempotencyKey?: () => string;
}

export class PleiadesApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Pleiades API error ${status}: ${JSON.stringify(body)}`);
    this.name = "PleiadesApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Thin typed client for the Pleiades API. Mirrors the v0.1 contract:
 * catalog (unmetered), poll/delta (metered, cursor-based).
 */
export class PleiadesClient {
  readonly baseUrl: string;
  private readonly credential?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly idempotency: () => string;

  constructor(options: PleiadesClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.credential = options.credential;
    this.fetchImpl = options.fetch ?? fetch;
    this.idempotency = options.idempotencyKey ?? crypto.randomUUID;
  }

  /** List warm beats. Unmetered; no credential needed. */
  async catalog(): Promise<CatalogResponse> {
    const body = await this.request("/v1/catalog", { method: "GET" });
    return CatalogResponseSchema.parse(body);
  }

  /** Check whether a beat moved. Metered when packs exist. */
  async poll(req: PollRequest): Promise<PollResponse> {
    const body = await this.request("/v1/poll", {
      method: "POST",
      body: JSON.stringify(PollRequestSchema.parse(req)),
    });
    return PollResponseSchema.parse(body);
  }

  /** Read the next bounded page of newer items. Metered. */
  async delta(req: PollRequest): Promise<PollResponse> {
    const body = await this.request("/v1/delta", {
      method: "POST",
      body: JSON.stringify(PollRequestSchema.parse(req)),
    });
    return PollResponseSchema.parse(body);
  }

  /** Register a webhook; the HMAC secret is returned exactly once. */
  async registerWebhook(req: WebhookRegistrationRequest): Promise<WebhookRegistered> {
    const body = await this.request("/v1/webhooks", {
      method: "POST",
      body: JSON.stringify(WebhookRegistrationRequestSchema.parse(req)),
    });
    return WebhookRegisteredSchema.parse(body);
  }

  /** List webhooks (secrets never returned). */
  async listWebhooks(): Promise<WebhookListResponse> {
    const body = await this.request("/v1/webhooks", { method: "GET" });
    return WebhookListResponseSchema.parse(body);
  }

  /** Revoke a webhook by id. */
  async revokeWebhook(webhookId: string): Promise<{ webhook_id: string; state: string }> {
    const body = await this.request(`/v1/webhooks/${webhookId}`, { method: "DELETE" });
    return body as { webhook_id: string; state: string };
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(this.credential ? { "X-PAYMENT": this.credential } : {}),
      // Idempotency on metered calls protects against double-charge on retry.
      ...(init.method === "POST" ? { "Idempotency-Key": this.idempotency() } : {}),
    };

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        /* non-JSON error body */
      }
      throw new PleiadesApiError(response.status, body);
    }
    return response.json();
  }
}
