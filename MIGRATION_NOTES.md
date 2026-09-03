# SQLite → Postgres migration notes

Done deliberately for scaling, ahead of real production traffic, on request.
This is a record of exactly what changed and why, for anyone picking this up.

## What changed

- **`app/server/db.js`** — rewritten against `pg` (node-postgres) instead of
  Node's built-in `node:sqlite`. Same exported shape (`run`, `get`, `all`) so
  every route's SQL and query pattern stays identical — callers pass `?`
  placeholders exactly as before; `db.js` itself rewrites them to Postgres's
  `$1/$2/...` style internally. Schema creation moved into an explicit
  `migrate()` function (Postgres connection setup is inherently async, unlike
  the old synchronous file-based SQLite open).
- **Every route file, plus `middleware/requireAuth.js` and `index.js`** —
  converted to `async`/`await` around every database call. This was the one
  part that could *not* stay a same-file change: SQLite via `node:sqlite` is
  synchronous, but a real network database like Postgres is not — there's no
  production-grade synchronous Postgres driver. Every handler that touches
  the database is now `async`, with `try/catch` → `next(err)` for error
  handling (Express's default error handler now catches DB failures instead
  of them crashing the process, which the old synchronous version never
  needed to think about).
- **`test/helpers.js`** — SQLite's per-run isolation (a throwaway file path)
  has no direct Postgres equivalent, so this now creates a throwaway Postgres
  **schema** per test run (`CREATE SCHEMA test_<uuid>`), points the app's own
  connection pool at it via the `options=-c search_path=...` connection
  parameter, and drops the schema on cleanup. Needs a real reachable Postgres
  instance — set `TEST_DATABASE_URL` (falls back to `DATABASE_URL`).
- **`scripts/backup.js`** — now shells out to `pg_dump` (compressed custom
  format, restorable with `pg_restore`) instead of copying a SQLite file.
  Requires the `postgresql-client` system package (the Dockerfile installs
  it). Most managed Postgres providers already run their own automatic
  backups — treat this script as a portable, provider-independent safety net,
  not a replacement for whatever the hosting provider already guarantees.
- **`Dockerfile`** — dropped the SQLite data volume; added `postgresql-client`
  for `pg_dump`. The app itself is now stateless — all state lives in
  whatever Postgres instance `DATABASE_URL` points at.
- **`.env.example`** — added `DATABASE_URL`, `PGSSL`, `TEST_DATABASE_URL`.
- **`package.json`** — added the `pg` dependency; relaxed the Node version
  floor from `>=22.5.0` to `>=20.0.0` (the 22.5 floor existed specifically
  for `node:sqlite`, which this file no longer uses).

## What deliberately did NOT change (and why)

- **JSON blob columns stayed `TEXT`, not `JSONB`.** Postgres's native
  `JSONB` type is the more idiomatic choice long-term (indexable, queryable,
  and the driver would hand back parsed objects instead of strings), but
  switching would mean every route that currently does
  `JSON.parse(row.categories)` / `JSON.stringify(categories)` before an
  insert would need to change too — because the `pg` driver returns `JSONB`
  columns already parsed. Doing that at the same time as the database swap
  would make this change much harder to verify in one pass. Worth doing as
  its own, later, deliberate change — not bundled in here.
- **Boolean-ish columns (`published`, `engagement_mode`, `used`, `active`)
  stayed `INTEGER` (0/1), not native `BOOLEAN`.** Every place that reads them
  already does `!!row.published`-style truthy checks, which works identically
  either way — but *writing* a JS boolean into a native Postgres `BOOLEAN`
  column via a parameterized query behaves differently from writing `0`/`1`
  into an `INTEGER` column, and several call sites currently do
  `published ? 1 : 0` explicitly. Kept as `INTEGER` for exact behavioral
  parity and lower risk; a real, separate, low-risk improvement for later.

## Known follow-up (not yet done)

- The in-memory rate limiter (`middleware/rateLimit.js`) has the same
  single-instance limitation SQLite had, for the same underlying reason —
  worth revisiting together if this ever needs to run on more than one server
  instance, same as noted in the PRD's own gap list.
