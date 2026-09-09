// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { eventArticleUris, type ProviderArticle, type ProviderEvent } from "./newsapi.ts";

/**
 * Phase 1 event linkage: map each article URI to the event cluster it belongs
 * to, and compute per-cluster corroboration (distinct sources in the cluster).
 * Pure function — no I/O, easy to test.
 */
export interface EventLinkage {
  /** article URI → event URI (or null when unclustered) */
  eventUriByArticle: Map<string, string>;
  /** event URI → distinct source count across the cluster */
  corroborationByEvent: Map<string, number>;
}

export function linkArticlesToEvents(
  articles: ProviderArticle[],
  events: ProviderEvent[],
): EventLinkage {
  const eventUriByArticle = new Map<string, string>();
  const sourcesByEvent = new Map<string, Set<string>>();

  for (const event of events) {
    const uris = eventArticleUris(event);
    if (uris.length === 0) continue;
    const sources = new Set<string>();
    for (const uri of uris) {
      eventUriByArticle.set(uri, event.uri);
      const article = articles.find((a) => a.uri === uri);
      const source = article?.source?.title ?? article?.source?.uri ?? "unknown";
      sources.add(source);
    }
    sourcesByEvent.set(event.uri, sources);
  }

  const corroborationByEvent = new Map<string, number>();
  for (const [eventUri, sources] of sourcesByEvent) {
    corroborationByEvent.set(eventUri, sources.size);
  }

  return { eventUriByArticle, corroborationByEvent };
}
