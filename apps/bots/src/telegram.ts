/**
 * Telegram delivery via the Bot API (sendMessage).
 * No SDK dependency — one fetch call per message.
 * Docs: https://core.telegram.org/bots/api
 */
export class TelegramBot {
  constructor(
    private readonly token: string,
    private readonly chatId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!token || !chatId) {
      throw new Error("TelegramBot requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID");
    }
  }

  async send(text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: this.chatId, text, disable_web_page_preview: false }),
    });
    if (!response.ok) {
      throw new Error(`Telegram sendMessage failed: HTTP ${response.status} ${await response.text()}`);
    }
  }
}
