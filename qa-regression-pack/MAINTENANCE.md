# Maintaining the JF Regression Pack

How to keep this pack aligned with the product as the developers change it. The pack is
**grounded in the live CIT app + the team's Page Objects** (the product FE/BE source is not
in this repo), so "staying in sync" means updating against those two sources.

## Where things live (change these, not the specs, when the app moves)
| Concern | File | Notes |
|---|---|---|
| API base, tenant, endpoints | `src/helpers/api.ts` (`ENDPOINTS`) | Update a path here and every spec using it follows. |
| Login recipes / demo accounts | `src/helpers/login.ts`, `src/helpers/users.ts` | Nafath recipe, demo-panel capture, role identities. |
| Known open bugs | `src/known-issues.ts` | The registry the reporter reads. See "known issues" below. |
| DB verification | `src/db.ts` | CloudBeaver-relay SELECT helper; env-gated on `CB_*`. |
| UI selectors (shared) | prefer the team Page Objects | See "selectors" below. |
| Release verdict logic | `src/reporting/priority-reporter.ts` | GO/NO-GO + NEW-vs-KNOWN classification. |

## The three test layers (every area should carry what applies)
- **BE (API)** — `*-api.spec.ts` / `*.spec.ts`: contract + RBAC + data-shape checks via `src/helpers/api.ts`.
- **FE (UI)** — `*.ui.spec.ts`: real-screen checks driven through the browser (system Edge).
- **DB** — `@db` tests using `src/db.ts`; guarded by `test.skip(!dbAvailable(), …)` so they run only when the `CB_*` CloudBeaver-relay creds are set, and skip cleanly otherwise.

## Selectors (FE) — grounding & sync
1. First choice: reuse the team Page Objects at `Automation-Tests/pages/` — they already track the app.
2. Otherwise: `getByRole` / `getByTestId` / Arabic visible text, taken from the **live CIT app**.
3. When a screen changes, update the selector in one place (a POM or a helper), not across specs.
4. If/when the product FE source becomes available locally, re-ground `data-testid`s against it and
   prefer testids over text.

## Known issues — keep the registry honest
- A spec that asserts behavior a known bug breaks calls `annotateKnownIssue(test, 'JF-xxxx')`, so its
  failure is reported **KNOWN** (not a new regression).
- After each bug-fix deploy: run the pack, then check the reporter's **"possibly fixed — verify &
  remove"** section. For each entry, confirm the fix and delete the key from `src/known-issues.ts`
  (and remove the annotation) so it becomes a real passing guard.

## After the developers push new source
1. Run the full pack (`npx playwright test`) and read `regression-report.md`.
2. **NEW BLOCKER/HIGH failures** → triage: real regression (file a bug) or a selector/endpoint that moved
   (update the file in the table above).
3. **"Possibly fixed"** → verify + retire the known-issue key.
4. New stories → add specs under the matching `tests/<area>/` (and/or fill the `tests-backlog/` skeleton).
5. Keep it `tsc --noEmit` clean.

## Guardrails
- Read-only against CIT: navigate/observe; `src/db.ts` is SELECT-only. No data mutations in the pack.
- No screenshots (team policy) — traces on failure only.
- QA artifacts (reports, defect logs) are **local-only** and gitignored — never commit them here.
