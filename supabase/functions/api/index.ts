import app from "../_shared/api/app.ts";

// Supabase Edge Function entrypoint for the Pleiades REST API.
// Deployed with: supabase functions deploy api --no-verify-jwt
//
// Supabase mounts this function at /functions/v1/api and strips /functions/v1,
// so the handler sees "/api/..." (the slug prefix). Strip it before dispatching
// to the Hono app, whose routes are rooted at / and /v1/.... Local dev
// (Deno serve) has no prefix and passes through unchanged.
Deno.serve((req) => {
  const url = new URL(req.url);
  const prefix = "/api";
  if (url.pathname === prefix) {
    url.pathname = "/";
  } else if (url.pathname.startsWith(`${prefix}/`)) {
    url.pathname = url.pathname.slice(prefix.length) || "/";
  }
  return app.fetch(new Request(url.toString(), req));
});
