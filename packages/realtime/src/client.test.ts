import assert from "node:assert/strict";
import { test } from "node:test";
import { PleiadesRealtime } from "./client.js";
import type { Pack } from "@pleiades/contracts";

const beatRow = {
  beat_id: "b_bb964843350e",
  label: "NVIDIA",
  concept_uris: ["http://en.wikipedia.org/wiki/Nvidia"],
  topic_filters: [],
  languages: ["eng"],
  excludes: "",
  state: "warm",
  refresh_interval_minutes: 60,
  freshness_slo_minutes: 90,
};

const latestRow = {
  pack_id: "p1",
  beat_id: "b_bb964843350e",
  computed_at: "2026-09-10T08:00:00Z",
  cursor: "cur-1",
  item_count: 1,
  token_estimate: 100,
  receipt_id: "pending",
};

const itemRow = {
  lede: "NVIDIA beats estimates.",
  url: "https://example.com/a1",
  source: "Reuters",
  published_at: "2026-09-10T07:58:00Z",
  first_indexed_at: "2026-09-10T07:59:00Z",
  event_id: null,
  corroboration: 0,
  concepts: ["http://en.wikipedia.org/wiki/Nvidia"],
  sentiment: 0.2,
  position: 0,
};

/** Minimal thenable chain mimicking supabase-js query builders. */
function makeFakeDb(): unknown {
  let insertHandler: ((payload: unknown) => void) | null = null;
  let statusCb: ((status: string) => void) | null = null;

  const channel = {
    on: (_type: string, _opts: unknown, cb: (payload: unknown) => void) => {
      insertHandler = cb;
      return channel;
    },
    subscribe: (cb: (status: string) => void) => {
      statusCb = cb;
      return channel;
    },
  };

  const thenable = (rows: unknown) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      contains: () => chain,
      then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
    };
    return chain;
  };

  const beatsChain = {
    select: () => beatsChain,
    eq: () => beatsChain,
    maybeSingle: async () => ({ data: beatRow, error: null }),
  };

  return {
    db: {
      channel: () => channel,
      removeChannel: async () => "ok",
      from: (table: string) => (table === "beats" ? beatsChain : thenable([itemRow])),
    },
    fireInsert: () => insertHandler?.({ new: latestRow }),
    setStatus: (s: string) => statusCb?.(s),
  };
}

test("emits the canonical pack when a pack row is inserted", async () => {
  const fake = makeFakeDb() as {
    db: never;
    fireInsert: () => void;
    setStatus: (s: string) => void;
  };

  const receivedBox: { pack: Pack | null } = { pack: null };
  let status = "";
  let resolvePack: (() => void) | null = null;
  const packPromise = new Promise<void>((resolve) => {
    resolvePack = resolve;
  });

  const rt = new PleiadesRealtime({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon",
    beatIds: ["b_bb964843350e"],
    onPack: (pack) => {
      receivedBox.pack = pack;
      resolvePack?.();
    },
    onStatus: (s) => {
      status = s;
    },
    db: fake.db,
  });

  rt.subscribe();
  fake.setStatus("SUBSCRIBED");
  fake.fireInsert();
  await packPromise;

  assert.equal(status, "SUBSCRIBED");
  const received = receivedBox.pack;
  assert.ok(received);
  assert.equal(received?.beat_id, "b_bb964843350e");
  assert.equal(received?.beat_label, "NVIDIA");
  assert.equal(received?.items.length, 1);
  assert.equal(received?.items[0]?.source, "Reuters");
  await rt.unsubscribe();
});

test("errors on empty beat list without throwing", () => {
  let error: unknown = null;
  const fake = makeFakeDb() as { db: never };
  const rt = new PleiadesRealtime({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon",
    beatIds: [],
    onPack: () => {},
    onError: (e) => {
      error = e;
    },
    db: fake.db,
  });
  rt.subscribe();
  assert.ok(error instanceof Error);
});
