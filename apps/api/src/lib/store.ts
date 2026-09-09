import {
  createSupabaseClient,
  findBeat,
  latestPack,
  loadPack,
  hasSupabaseEnv,
} from "@pleiades/db";
import { UnchangedPollSchema, type PollResponse } from "@pleiades/contracts";

/**
 * Poll/delta snapshot from persisted packs (Phase 1).
 * Returns null when Supabase is not configured — the API then answers
 * `pack_not_ready`, which is the correct state for an unprovisioned stack.
 */
export async function getPollSnapshot(
  beatId: string,
  cursor?: string,
): Promise<PollResponse | null> {
  if (!hasSupabaseEnv()) return null;
  const db = createSupabaseClient();
  if (!db) return null;

  const beat = await findBeat(db, beatId);
  if (!beat) return null;

  const latest = await latestPack(db, beatId);
  if (!latest) return null;

  if (cursor && latest.cursor === cursor) {
    return UnchangedPollSchema.parse({
      beat_id: beatId,
      moved: false,
      cursor: latest.cursor,
      item_count: 0,
      receipt_id: latest.receipt_id,
    });
  }

  return loadPack(db, beatId, latest);
}
