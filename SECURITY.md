# Security

## Reporting

Email the maintainer rather than opening a public issue for anything exploitable.
A public issue on a small project is a disclosure with no window.

There is no bug bounty. There is a real thank-you and a fix.

## What this service holds

Worth stating plainly, because it decides what a vulnerability would be worth:

- **No accounts and no personal data.** The API is public and anonymous. There is
  no sign-up, no email, no profile.
- **API keys are stored as SHA-256 hashes.** The secret is shown once at issue and
  never again. A database leak does not yield working keys.
- **Calling addresses are hashed, never stored.** The rate limiter buckets by
  `sha256(address)` so it can count a caller without recording who they are.
- **No article bodies.** The API carries headlines, links and publisher names.
  There is nothing here that could not be read on Google News.

## Known weaknesses, stated rather than discovered

- **The rate limiter fails open.** If the counter is unreachable a request is
  served rather than refused. A free read API should not go down because its
  limiter did. The cost is that a database outage means no rate limiting.
- **`usage_ledger` is recording, not enforcing.** Nothing is billed and nothing is
  refused for cost. See `docs/MONETIZATION.md`.
- **Google News links are redirects.** A resolved link could point anywhere, and
  nothing follows it. Treat the publisher name as the claim and the link as a
  pointer.

## Scope

In scope: the API, the worker, the site, the deployment configuration.

Out of scope: the content of the articles themselves, and anything in
`node_modules`.
