// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@^2.45.4";

/**
 * Environment access that works on both Node (process.env) and Deno
 * (Deno.env). Supabase Edge Functions auto-inject SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY, so no secrets are needed there.
 */
export function env(name: string): string | undefined {
  const g = globalThis as { Deno?: { env: { get(key: string): string | undefined } } };
  if (typeof g.Deno !== "undefined" && g.Deno.env) {
    return g.Deno.env.get(name);
  }
  return process.env[name];
}

/** True when Supabase credentials are available in the environment. */
export function hasSupabaseEnv(): boolean {
  return Boolean(env("SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"));
}

/**
 * Create a Supabase client from the environment.
 * Returns null when the platform is not configured (local dev fallback).
 */
export function createSupabaseClient(): SupabaseClient | null {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
