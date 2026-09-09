/**
 * Discord delivery via webhook. No SDK dependency.
 * Docs: https://discord.com/developers/docs/resources/webhook
 */
export class DiscordWebhook {
  constructor(
    private readonly webhookUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!webhookUrl) throw new Error("DiscordWebhook requires DISCORD_WEBHOOK_URL");
  }

  async send(text: string): Promise<void> {
    const response = await this.fetchImpl(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.slice(0, 2000) }),
    });
    if (!response.ok) {
      throw new Error(`Discord webhook failed: HTTP ${response.status} ${await response.text()}`);
    }
  }
}
