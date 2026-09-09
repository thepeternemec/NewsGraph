import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Pack } from "@pleiades/contracts";
import { loadPack, type LatestPackRow } from "@pleiades/db";

export interface PleiadesRealtimeOptions {
  supabaseUrl: string;
  /** Project anon key (RLS-public metadata) — never the service role key in clients. */
  supabaseAnonKey: string;
  beatIds: string[];
  onPack: (pack: Pack) => void;
  onStatus?: (status: string) => void;
  onError?: (error: unknown) => void;
  /** Test seam: pre-built Supabase client (skips createClient). */
  db?: SupabaseClient;
}

/**
 * Phase 2 push client. Subscribes to INSERTs on the `packs` table
 * (Supabase Realtime postgres_changes) for the configured beats and emits
 * each new pack in the canonical pack shape — the same object a poll would
 * return. Push reuses pull semantics; no second mental model.
 */
export class PleiadesRealtime {
  private readonly db: SupabaseClient;
  private readonly beatIds: string[];
  private readonly onPack: (pack: Pack) => void;
  private readonly onStatus?: (status: string) => void;
  private readonly onError?: (error: unknown) => void;
  private channel: ReturnType<SupabaseClient["channel"]> | null = null;

  constructor(options: PleiadesRealtimeOptions) {
    this.db =
      options.db ??
      createClient(options.supabaseUrl, options.supabaseAnonKey, {
        auth: { persistSession: false },
      });
    this.beatIds = options.beatIds;
    this.onPack = options.onPack;
    this.onStatus = options.onStatus;
    this.onError = options.onError;
  }

  /** Subscribe to pack inserts for the configured beats. */
  subscribe(): this {
    if (this.beatIds.length === 0) {
      this.onError?.(new Error("PleiadesRealtime: no beat ids configured"));
      return this;
    }
    const filter = `beat_id=in.(${this.beatIds.join(",")})`;
    this.channel = this.db
      .channel(`pleiades-packs-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "packs", filter },
        (payload) => {
          void this.handleInsert((payload as unknown as { new: LatestPackRow }).new);
        },
      )
      .subscribe((status) => this.onStatus?.(status));
    return this;
  }

  /** Close the subscription channel. */
  async unsubscribe(): Promise<void> {
    if (this.channel) {
      await this.db.removeChannel(this.channel);
      this.channel = null;
    }
  }

  private async handleInsert(row: LatestPackRow): Promise<void> {
    try {
      const pack = await loadPack(this.db, row.beat_id, row);
      if (pack) this.onPack(pack);
    } catch (error) {
      this.onError?.(error);
    }
  }
}
