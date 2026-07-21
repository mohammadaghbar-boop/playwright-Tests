# Maintaining the JF Real-Life Scenarios pack

How to keep these persona journeys aligned with the product as the developers change it.

The product **FE and BE source is not in this repo** — the app is exercised against the live
CIT deployment (`https://d-infath-jf-portal.azm-cit.com`). So "staying in sync" means grounding
every selector, route and endpoint in **two sources that track the real app**:

1. the **live CIT app** (what a real user sees on screen), and
2. the team's **Page Objects** at `../../joint-funds-automation/Automation-Tests/pages/`.

When a journey breaks, the cause is almost always that the app moved — update the pack against
those two sources, don't paper over it.

## Every journey now verifies three layers
Where a screen is backed by an API and a table, the journey cross-checks all three:

- **FE (UI)** — the narrated `step(...)` walk through the browser: what the persona actually sees.
- **BE (API)** — a `step('cross-check via API', …)` that reads the same data through the backend
  (`apiLoginAs` / `apiGet` / `fetchCourtCases`, or by observing the real response the page fires)
  and asserts it matches the UI. Read-only: GET only.
- **DB** — a `step('cross-check via DB', …)` guarded by `dbAvailable()`; a SELECT-only check that
  the row behind the screen is correct. Skips cleanly (records a `db-skipped` annotation) when the
  `CB_*` creds are absent, so the UI + API layers still stand.

| Journey | FE | BE (API) | DB |
|---|---|---|---|
| `estate-manager-e2e` | ✅ | ✅ court-cases list + detail (EstateManager) | ✅ `[Case].CourtCases` by `file_number` |
| `liquidator-day` | ✅ | ✅ INH00016 assignment (via EstateManager backbone) | ✅ `[Case].CourtCases.liquidator_id` |
| `relationship-manager-day` | ✅ | ✅ court-cases list (RM) | ✅ `[Case].CourtCases` by `file_number` |
| `purchasing-review` | ✅ | ✅ observes the facilities-list backend response | ⏳ deferred — see "Facilities" below |
| `public-letter-verification` | — | ✅ **is** the BE layer (public verify endpoint) | n/a (no reachable seeded letter fixture) |
| `heir-journey` | ✅ | documents an empty/blocked state (no linked-estate data to cross-check) | n/a |
| `service-provider-onboarding` | ✅ | ✅ probes the site-config endpoint at the JF-1097 wall | n/a (stops at the wall, no committed row) |

## Where things live (change these, not the specs, when the app moves)
| Concern | File | Notes |
|---|---|---|
| Portal / API / SSO / mock URLs | `src/world.ts` (`URLS`) | Base URLs + tenant. Override per-env via `.env`. |
| Tenant id | `src/world.ts` (`TENANT_ID`) | Sent on every API call as `TenantIdentifier`. |
| Personas + login recipes | `src/personas.ts` | Who each journey is, and how they sign in (`loginMethod`). |
| Login flows | `src/journey.ts` | `loginAs` dispatches Nafath / internal / demo-panel. Update a recipe here, every journey follows. |
| BE (API) helpers | `src/journey.ts` | `apiLoginAs`, `apiSessionFromToken`, `apiGet`, `tokenFromPage`, `fetchCourtCases`. |
| DB verification | `src/db.ts` | CloudBeaver-relay **SELECT-only** helper; env-gated on `CB_*`. |
| Known open bugs (walls) | `src/world.ts` (`KNOWN_BLOCKERS`) | The registry `blockedHere` reads. See "known walls" below. |
| Live fixtures (estate/heir/letter) | `src/world.ts` (`FIXTURES`) | INH00016, registered heir NID, letter number, deceased NIDs. |
| UI selectors (shared) | prefer the team Page Objects | See "Selectors" below. |

## Selectors (FE) — grounding & sync
1. First choice: reuse the team Page Objects at `Automation-Tests/pages/` (`LoginPage`,
   `EstatesListPage`, `BasePage`) — they already track the app and are POM-shaped.
2. Otherwise use `getByRole` / `getByTestId` / Arabic visible text, taken from the **live CIT app**.
   Avoid structural CSS and `text=` except as a last resort.
3. When a screen changes, update the selector in **one place** (a POM or a journey helper such as
   `openEstate` / `openInternalPage`), never scattered across steps.
4. Waits are web-first only (`expect(locator)…`, `locator.waitFor()`, `expect.poll`). Never add
   `waitForTimeout` or `waitForLoadState('networkidle')` — they are the main flakiness source.
5. If/when the product FE source becomes available locally, re-ground `data-testid`s against it and
   prefer testids over Arabic text.

## BE (API) layer — grounding & sync
- Verified endpoint shapes are documented at the top of the BE helpers in `src/journey.ts`.
  The court-cases contract: `GET /cases/api/v1/court-cases?pageIndex&pageSize` →
  `{ isSuccess, data.items[] }`, item = `{ caseId, fileNumber, classification, estateManagerName,
  relationshipManagerName, liquidatorName }`; detail `GET /cases/api/v1/court-cases/{caseId}`.
- Auth: `POST /users/api/v1/auth/login { Email, Password }` → `data.accessToken`. The estate
  backbone authorizes the **EstateManager** role (the PurchasingDept/PD account returns 401 there),
  so backbone cross-checks log in as EstateManager even for the liquidator journey.
- For UI-only logins (Nafath / demo-panel) whose password we can't replay, scrape the SPA token
  with `tokenFromPage(page)` and hand it to `apiSessionFromToken`.
- When a payload field is renamed by the devs: update `CourtCaseListItem` in `src/journey.ts` and the
  cross-check follows.

## DB verification — grounding & sync (`CB_*`)
- The CIT SQL Server (Azm_JointFunds) is VPC-restricted; `src/db.ts` relays **SELECT** statements through the
  CloudBeaver web API, exactly like the team's `Automation-Tests/utils/db-client.ts`.
- To activate the DB layer, set all of these (in `.env`, gitignored — never commit them):
  `CB_BASE_URL`, `CB_USERNAME`, `CB_PASSWORD`, `CB_CONNECTION_NAME`, `CB_DATABASE`.
  With any missing, `dbAvailable()` is false and every DB step records a `db-skipped` annotation
  and returns — the journey still runs and still reports its UI + API verdict.
- Values come back as **strings** (CloudBeaver serialization) — compare against strings.
- Correct-by-construction schema hints (grounded in the team suite + `system-docs/issues`):
  `[Case].CourtCases` (SQL Server, schema `Case` is bracketed) has `id`, `file_number` (the `INHxxxxx` number), `classification`, `liquidator_id`, `deceased_national_id`;
  `classification`, `liquidator_id`. New DB checks should reuse these or add columns only after
  confirming them against the team's SELECTs or a `system-docs` issue.
- **Facilities:** the purchasing journey's facility rows are **not** in the verified `cases` SELECT
  corpus (facilities flow through the MoC/companies service). Its DB layer is intentionally deferred
  rather than guessing a table name. If/when a facility table is confirmed, add a guarded
  `cross-check via DB` step keyed on the facility's الرقم الوطني الموحد.

## Known walls (`blockedHere` / `KNOWN_BLOCKERS`) — keep them honest
- When a real user hits a wall that is a **known open bug**, a journey calls
  `blockedHere('JF-xxxx', 'what the user sees')`. That annotates the run with the Jira key and stops
  the journey **cleanly** (a skip, not a red fail) — so the result tells you *how far a real user
  gets today* instead of failing as if it were a new regression.
- The catalogue is `KNOWN_BLOCKERS` in `src/world.ts` (`JF-1097`, `JF-1058`, `JF-757`, `JF-727`,
  `JF-1102`, `JF-946`).
- **Retiring a wall after a fix ships:** re-run the affected journey. If the step now passes,
  1) remove the `blockedHere(...)` call (let the journey continue through the now-working flow and
     assert the success state), and
  2) delete the key from `KNOWN_BLOCKERS`.
  A journey that no longer skips is the signal the fix is real end-to-end.
- BE/DB cross-check steps are placed so they run *before* the risky UI walls where it matters
  (e.g. the liquidator journey verifies INH00016 via API + DB right after login, so the backend
  truth is still captured even when the JF-946 routing wall stops the UI walk).

## After the developers push new source / a new deploy
1. Run the journeys one at a time (single worker — the Nafath mock rejects concurrent same-user
   logins): `npx playwright test <journey> --reporter=line`.
2. A **red fail** = the app moved (selector/route/endpoint) or a genuine new break — triage and fix
   the file in the table above; don't convert a real break into a `blockedHere`.
3. A **clean skip** on a `blockedHere` = a known wall still stands (expected). If it *passed*
   through, retire the wall (above).
4. New persona flows → add a new `journeys/<persona>.journey.spec.ts` reusing `step`/`loginAs` and
   the BE/DB helpers.
5. Keep it `npx tsc --noEmit` clean.

## Guardrails
- **Read-only against CIT:** journeys navigate/observe; where an action would mutate, they assert the
  control is present then back out (e.g. purchasing opens the confirm dialog and cancels).
  `src/db.ts` is SELECT-only. No data mutations, ever.
- **No screenshots** (team policy) — evidence is the narrated report + traces on failure only.
- **Secrets live in `.env`** (gitignored) — never hardcode credentials or `CB_*` values in specs.
- **QA artifacts are local-only** and gitignored (defect logs, cycle reports, draft Jira, etc.) —
  never commit them here.
- **Parallel sessions:** do repo-mutating work on an isolated branch/worktree — several Claude Code
  sessions may run at once.
