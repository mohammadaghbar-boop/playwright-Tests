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
2. **Portal reachability + browser login** — confirm the CIT/Dev portal responds and that
   the needed role can actually **log in through the browser** (the real login flow —
   email/password or Nafath mock — on the `msedge` channel), not just that an API token
   works. FE cases depend on a working UI session.
3. **DB relay** — if cases assert DB state, confirm the CloudBeaver relay
   (`Automation-Tests/utils/db-client.ts`) can run a trivial `SELECT 1`. Remember: only
   `SELECT`/`UPDATE` are allowed; results come back as strings.
4. **Endpoints / mock data** — confirm any required API endpoints or mock-server records
   exist; note the specific test records/IDs to be used.

Record what's available vs blocked in `qa-artifacts/$story/03-env-check.md`. If something
needed can't be provisioned with the access we have, flag it — those cases will later be
classified **Requires dev support**. Never target production.

### Pull the latest BE + FE source — mandatory, never skipped
The judgment phases read the implementation, so make it available **fresh on every run**:
- Repos (private): `Azm-Tech/azm-joint-fund-backend` and `Azm-Tech/azm-joint-fund-portal`.
- Locations + URLs come from config/env (`JF_BACKEND_PATH` / `JF_PORTAL_PATH`, default sibling
  folders). **Never store credentials** — rely on the machine's own git auth (`gh` / Git
  Credential Manager / SSH). Confirm the authed identity has access to the Azm-Tech org.
- On each run: if the checkout exists, `git -C <path> fetch && git pull --ff-only` (shallow is
  fine); otherwise `git clone --depth 1`. Record the pulled commit SHAs in `03-env-check.md`.
- **CRITICAL — never skip a step for missing GitHub access.** If the clone/pull fails because
  access isn't granted on the first try, **STOP and ask the user to grant access** (`gh auth
  login` as their Azm identity, or a read-only PAT for the two repos), then retry. Do **not**
  skip the source-analysis step or any downstream step, and never proceed as if the code were
  read.

### Create the test data yourself — don't wait for the tester
**Proactively manufacture any data the cases need** rather than skipping positive cases or
handing the job back to a human. Use **every available resource**: the feature's **source
code** (to know exactly how a valid record is created), the repo's **automation packs / POMs
/ fixtures**, the **mock servers**, the **DB relay** (SELECT/UPDATE), and prior **memory** of
working fixtures. Always create through the **real product flow** (the same steps a real
user/API takes). **Record the exact IDs as a reusable fixture** in `03-env-check.md` and
schedule **cleanup at closure**. Timestamp-aging for time-based ACs (48h) is legitimate;
**forging classifications/domain results directly in the DB is not**. Only when creation is
genuinely impossible with our access is a case **Requires dev support** — say precisely why.
