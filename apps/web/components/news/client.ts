export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/news-api";
export interface Topic {
    beat_id: string;
    label: string;
    last_checked_at: string | null;
    last_success_at: string | null;
    status: "fresh" | "stale" | "unavailable";
    article_count?: number;
}
export interface NewsItem {
    id: string;
    title: string;
    excerpt: string;
    url: string;
    source: string;
    published_at: string;
    first_indexed_at: string;
    beat_id: string;
}
export interface NewsPage {
    items: NewsItem[];
    cursor: string;
    history_cursor?: string;
    has_more: boolean;
    freshness: {
        status: string;
        last_success_at: string | null;
    };
}
export async function api<T>(path: string, signal?: AbortSignal): Promise<T> { const response = await fetch(`${API_BASE}${path}`, { signal, cache: "no-store" }); if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message ?? "News is temporarily unavailable. Please try again shortly.");
} return response.json(); }
export function dateLabel(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
