/**
 * Data access, as plain Postgres.
 *
 * Deliberately small: `db()` returns a client, the schema lives in
 * `db/schema.sql`, and every query is written where it is used so it can
 * be read next to the route that needs it.
 */
export * from "./client.js";
export * from "./keys.js";
