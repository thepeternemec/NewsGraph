import { TelegramBot } from "./telegram.js";
import { DiscordWebhook } from "./discord.js";
import { formatPack } from "./format.js";

/**
 * Bot delivery loop — Phase 3 skeleton.
 *
 * The full loop (Phase 2/3) subscribes to the API/WS pack stream and forwards
 * new packs here. Until ingestion lands, this entry point verifies the
 * configured channels with a test message.
 */
async function main(): Promise<void> {
  const telegram = process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
    ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID)
    : null;
  const discord = process.env.DISCORD_WEBHOOK_URL
    ? new DiscordWebhook(process.env.DISCORD_WEBHOOK_URL)
    : null;

  if (!telegram && !discord) {
    console.error(
      "[pleiades-bots] no channels configured. Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID or DISCORD_WEBHOOK_URL.",
    );
    process.exitCode = 1;
    return;
  }

  const ping = "⭐ Pleiades bot channel connected. Live packs will flow here once ingestion lands (Phase 1–3).";
  try {
    if (telegram) await telegram.send(ping);
    if (discord) await discord.send(ping);
    console.log("[pleiades-bots] channel check sent.");
  } catch (error) {
    console.error("[pleiades-bots] channel check failed:", error);
    process.exitCode = 1;
  }
}

void main();

// Re-export the formatters and adapters for the Phase 3 loop.
export { TelegramBot } from "./telegram.js";
export { DiscordWebhook } from "./discord.js";
export { formatItem, formatPack, sentimentBadge } from "./format.js";
