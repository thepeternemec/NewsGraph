import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { hmacSha256Hex, signPayload } from "./deliver.js";

test("hmacSha256Hex matches node:crypto HMAC-SHA256", async () => {
  const ours = await hmacSha256Hex("webhook-secret", "payload-body");
  const expected = createHmac("sha256", "webhook-secret").update("payload-body").digest("hex");
  assert.equal(ours, expected);
});

test("signPayload produces t=<unix>,v1=<64 hex> format", async () => {
  const signature = await signPayload("webhook-secret", "{}");
  assert.match(signature, /^t=\d+,v1=[0-9a-f]{64}$/);

  const [, t, sig] = signature.match(/^t=(\d+),v1=([0-9a-f]{64})$/)!;
  const body = "{}";
  const expected = createHmac("sha256", "webhook-secret").update(`${t}.${body}`).digest("hex");
  assert.equal(sig, expected);
});
