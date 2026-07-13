# Automation-Tests

Playwright suite for the Infath Joint Funds portal, run against the deployed CIT/Dev
environment (`https://d-infath-jf-portal.azm-cit.com` by default). This is a standalone
Playwright project (root `package.json`/`playwright.config.ts`) — separate from
`azm-joint-fund-portal/e2e/`, which targets a locally-booted real stack instead.

## Setup

```bash
cd Joint-Fund          # repo root, NOT Automation-Tests/
npm install
cp .env.example .env
# edit .env with real values (see below) — .env is gitignored, never commit it
```

## Running tests

```bash
# UI-only specs (no DB access needed)
npx playwright test Automation-Tests/services-list.spec.ts

# Specs that use the `db` fixture (see below) — needs .env configured AND
# network access to the target Postgres instance
npx playwright test Automation-Tests/db-fixture-example.spec.ts
```

## Database verification (`db` fixture)

Some tests need to assert database state after a UI action — not just trust that the
UI showed a success toast. Two pieces make this available to any spec:

- **`utils/db-client.ts`** — relays queries through CloudBeaver's GraphQL API
  (`https://d-infath-db.azm-cit.com`) rather than connecting to Postgres directly. The
  QA/CIT Postgres instance itself is VPC/IP-restricted and unreachable from a normal dev
  machine or CI runner; CloudBeaver already runs somewhere with real network access to
  it and is reachable over plain HTTPS, so it's used as a relay — logging in exactly like
  the browser does, then driving its SQL-execution API. Configured entirely from
  environment variables (`CB_BASE_URL`, `CB_USERNAME`, `CB_PASSWORD`,
  `CB_CONNECTION_NAME`, `CB_DATABASE` — see `.env.example` at the repo root). Exposes
  `query(sql, params)` and `closePool()`.
- **`fixtures/db-fixture.ts`** — extends the base Playwright `test` with a `db` fixture
  that exposes the same `query()` function, reusing the same cached session/context (no
  new CloudBeaver login per test).

**Read `utils/db-client.ts`'s module doc comment before using this** — three things
about it are NOT like a normal DB client:

1. **Only `SELECT` and `UPDATE` are allowed.** Every query is parsed with
   `node-sql-parser` and anything else — `INSERT`/`DELETE`/`DROP`/`TRUNCATE`/`ALTER`/
   multi-statement — is rejected outright. This is permanent, not a TODO: test cleanup
   must use a soft-delete `UPDATE` (e.g. `SET is_deleted = true`), never a hard `DELETE`.
2. **`params` are client-side escaped SQL literals, not server-side bound parameters.**
   CloudBeaver's query-execution API has no placeholder-binding concept. Only
   `string | number | boolean | null` values are supported in `params` — anything else
   throws rather than risk being mis-escaped.
3. **Every query runs as the shared `CB_USERNAME` CloudBeaver account** (an
   ADMINISTRATOR-role account) — CloudBeaver's own audit log shows that account, not the
   individual engineer or CI job that ran the test.
4. **Result values come back mostly as strings, not native JS types** (confirmed
   empirically — `SELECT 1` returns the string `"1"`, only `null`/booleans are native).
   The client deliberately does not guess-coerce numeric-looking strings back to
   numbers, since that risks silently mangling text fields that happen to look numeric
   (e.g. dropping a leading zero from a phone number). Compare against strings in
   assertions, or convert the specific field yourself when you know it's safe.

Usage in a spec:

```ts
import { test, expect } from './fixtures/db-fixture';

test('creates a row correctly', async ({ page, db }) => {
  await page.goto('/some-form');
  // ... drive the UI ...
  const { rows } = await db.query('SELECT * FROM some_table WHERE id = $1', [id]);
  expect(rows).toHaveLength(1);
});
```

See `db-fixture-example.spec.ts` for a complete, working example: it logs in as the
seeded `demo-liquidator@azm.sa` account, creates an inquiry authority through the real
UI, verifies the exact row in `cases.case_inquiry_authorities` (not just the UI's
success toast), then **soft-deletes the row it created** (`UPDATE ... SET is_deleted =
true`) in a `finally` block so repeated runs don't accumulate test data or trip the
feature's own duplicate-name check.

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `CB_BASE_URL` | CloudBeaver base URL; defaults work for QA/CIT (`https://d-infath-db.azm-cit.com`) |
| `CB_USERNAME` | CloudBeaver local-auth username (ask a team member) |
| `CB_PASSWORD` | CloudBeaver local-auth password — **never commit this**, `.env` is gitignored. Hashed client-side (MD5, matching CloudBeaver's own web client protocol) before being sent; never transmitted or logged in plaintext by this code |
| `CB_CONNECTION_NAME` | Name (or substring) of the saved connection in CloudBeaver, e.g. `PostgreSQL@pgm-l4v92x9095m41myg` |
| `CB_DATABASE` | The actual application database (`Azm_JointFunds` for QA/CIT) — the connection's own default catalog is the admin `postgres` DB, not this one |
| `BASE_URL` | Portal URL under test; defaults to `https://d-infath-jf-portal.azm-cit.com` |

**⚠️ Known tradeoffs (flag for the team, not fully solved here):**
- This shares one CloudBeaver admin identity across everyone who runs these tests —
  there's no per-engineer audit trail the way there would be with individual credentials.
  Acceptable for QA/CIT (non-production) data; don't extend this pattern to anything
  production-facing without revisiting it.
- `CB_PASSWORD` is a real, standing credential for an ADMINISTRATOR-role CloudBeaver
  account. Treat `.env` accordingly, and rotate the password (updating `.env`
  everywhere it's used) if it's ever suspected to have leaked.
- The QA/CIT database password is *also* separately committed in plaintext across 8
  `appsettings.QA.json` files in `azm-joint-fund-backend` — unrelated to this client
  (which never touches that credential directly), but a real secret-hygiene gap worth
  rotating independently.

### Network access

Pure UI specs (like `services-list.spec.ts`, which don't import the `db` fixture) only
need HTTPS access to the portal and are unaffected by any of the above. DB-asserting
specs need outbound HTTPS access to `CB_BASE_URL` — which, unlike the raw Postgres port,
is not VPC/IP-restricted, so this works from a normal dev machine or a standard
(non-allow-listed) CI runner.

### Teardown

`playwright.config.ts`'s `globalTeardown` points at `Automation-Tests/global-teardown.ts`,
which calls `closePool()` once after the entire run finishes — this clears the cached
CloudBeaver session/context state (there's no literal TCP pool to close with this relay;
the name is kept for interface continuity). Individual specs/fixtures must NOT call
`closePool()` themselves — doing so would break any other spec still running in the same
worker.
