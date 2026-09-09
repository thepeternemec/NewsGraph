import app from "../_shared/api/app.ts";

// Supabase Edge Function entrypoint for the Pleiades REST API.
// Deployed with: supabase functions deploy api --no-verify-jwt
Deno.serve((req) => app.fetch(req));
