# auth.md

This service requires **no registration and no credential**. There is nothing to
obtain, nothing to exchange, and no session to establish. This file exists so an
agent does not spend a turn looking for an auth flow that does not exist.

Host: `newsgraph.vercel.app` · API base: `https://newsgraph.vercel.app/api`

## 1. Register

Skip this step. There is no `/agent/identity`, no `/oauth2/token`, and no claim
ceremony. `POST` to any of them returns `404`.

NewsGraph is a **public read-only news API**. Access is not gated, so there is no
user to register and no scoped token to mint. An agent may call it on first use,
with no setup and no operator involvement.

## 2. Authenticate

Send no `Authorization` header. Every request succeeds without one.

```http
GET /v2/brief?beat_id=b_bb964843350e HTTP/1.1
Host: newsgraph.vercel.app
```

Responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
and `X-RateLimit-Tier`.

## 3. If you are being rate limited

Anonymous callers get **120 requests a minute**, identified by calling address —
hashed, never stored. That ceiling is high enough for the intended loop: one
`changes` call per topic per schedule, not a poll.

A key raises it to **1200 requests a minute**. A key unlocks no data; it is not a
credential in the sense this protocol usually means, and your user does not need
an account for you to hold one.

Keys are issued by hand today — there is no self-serve endpoint, so this file
cannot tell you how to fetch one programmatically. Ask the operator.

```http
GET /v2/topics?limit=1 HTTP/1.1
Host: newsgraph.vercel.app
Authorization: Bearer ng_...
```

## 4. Discover the API instead

The discovery this service offers is about *content*, not identity. There is no
Protected Resource Metadata document, because there is no authorization server
for it to describe.

```http
GET /v2/tools HTTP/1.1
Host: newsgraph.vercel.app
```

Returns the four calls in OpenAI function-call shape:

| Tool | Use it to |
| --- | --- |
| `newsgraph_topics` | Find a topic. Never invent a `beat_id` |
| `newsgraph_news` | Read a topic and take a baseline cursor |
| `newsgraph_changes` | Ask what is new since that cursor |
| `newsgraph_brief` | The top headlines verbatim, with source and UTC time |

`GET /v2/topics?q=` searches by ticker or company name across 1034 topics — 934
US-listed equities and 100 crypto assets. A coin and a company can share a ticker
(Sui and Sun Communities are both `SUI`), so read `asset` to tell them apart.

## 5. Errors

| Status | Meaning | Action |
| --- | --- | --- |
| `200`, empty `items` | Nothing moved. Not an error | Report it plainly, do not retry |
| `400` | Malformed or expired cursor | Re-baseline with `/v2/news` |
| `404` | Unknown `beat_id` | Re-read `/v2/topics` |
| `429` | Rate limited | Wait for `Retry-After` |
| `503` | Storage unreachable | Back off. Never tight-loop |

## 6. What would change this file

Registration becomes meaningful only if the API stops being public — for example
if paid tiers are introduced alongside a free allowance. Billing is **not**
implemented, so that is not the case today.

If and when an authorization server exists, this file will be rewritten to the
full protocol: Protected Resource Metadata, `/agent/identity`, the claim
ceremony, and the RFC 7523 exchange. It will not describe them before they exist,
because an agent that follows a flow this service does not implement wastes a
turn and learns to distrust the file.
