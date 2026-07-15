---
name: stlc-env-setup
description: Provision and verify the access a story's tests need — mock server data, DB (CloudBeaver) relay, API endpoints, and .env credentials — before execution.
when_to_use: "set up the test environment", provision access/data, prepare to run tests
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Edit, Grep, Bash
---

## Provision & verify test access for $story

Use the test plan's "environment & data needs" (`qa-artifacts/$story/00-test-plan.md`).
Set up only what the cases require, then **verify each is actually reachable** — don't
assume.

Checklist (do the relevant ones):
1. **`.env`** — ensure required keys exist (portal `BASE_URL`, `CB_*` for the CloudBeaver
   DB relay, any API tokens). Never commit `.env`; never print secret values. If a key is
   missing, ask the user to supply it.
2. **Portal reachability** — confirm the CIT/Dev portal responds and the needed demo
   user/role can log in.
3. **DB relay** — if cases assert DB state, confirm the CloudBeaver relay
   (`Automation-Tests/utils/db-client.ts`) can run a trivial `SELECT 1`. Remember: only
   `SELECT`/`UPDATE` are allowed; results come back as strings.
4. **Endpoints / mock data** — confirm any required API endpoints or mock-server records
   exist; note the specific test records/IDs to be used.

Record what's available vs blocked in `qa-artifacts/$story/03-env-check.md`. If something
needed can't be provisioned with the access we have, flag it — those cases will later be
classified **Requires dev support**. Never target production.

### When the env has no usable test data
Prefer to **manufacture it through the real product flow** rather than skipping the positive
cases. If a fixture (e.g. an issued letter, an accepted case) doesn't exist and the DB relay
is read/UPDATE-only, create it via the actual UI/API path (the same steps a real user takes),
then **record the exact IDs as a reusable fixture** in `03-env-check.md` and note it for
**cleanup at closure**. Don't fabricate results and don't silently drop coverage.
