import type { Item, Pack } from "@pleiades/contracts";

/** Sentiment badge for chat surfaces. */
export function sentimentBadge(sentiment: number | null): string {
  if (sentiment === null) return "";
  if (sentiment > 0.15) return "🟢 ";
  if (sentiment < -0.15) return "🔴 ";
  return "⚪ ";
}

/** One message per item: lede + source + publisher link. */
export function formatItem(item: Item): string {
  const lines = [
    `${sentimentBadge(item.sentiment)}${item.lede}`,
    `Source: ${item.source}${item.corroboration > 0 ? ` · corroborated by ${item.corroboration + 1} source(s)` : ""}`,
    item.url,
  ];
  return lines.join("\n");
}

/** One message per pack: beat header + item messages (capped). */
export function formatPack(pack: Pack): string {
  const header = `⭐ ${pack.beat_label} — ${pack.item_count} new item(s)`;
  if (pack.items.length === 0) return header;
  return [header, ...pack.items.map(formatItem)].join("\n\n");
}
