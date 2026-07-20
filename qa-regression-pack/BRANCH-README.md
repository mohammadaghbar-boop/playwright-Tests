# QA Regression Pack — Joint Funds (2026-07-16 cycle)

This folder is the deliverable of the full QA testing-and-automation cycle run on **2026-07-16**
against the CIT environment. It lives on its own branch (`qa/regression-pack-2026-07`) so the team
can review and run it independently of `main`. **It does not touch the existing suite or the STLC
skills** — those stay as they are on `main`.

## What's here
```
qa-regression-pack/
  playwright.config.ts, package.json, tsconfig.json, .env.example
  src/            auth + api helpers, known-issues registry, GO/NO-GO priority reporter
  tests/          the implemented regression suite, organized BY FLOW:
                    01-auth 02-admin 03-sp-lifecycle 04-estate-core
                    05-heirs 06-assets-classification 07-liquidator 08-public
  tests-backlog/  generated skeletons for ALL 437 JF scenarios (whole-system coverage map)
```
> **QA artifacts** (test-cycle report, defect log, Jira drafts, system-understanding, etc.)
> are kept **locally only** and are intentionally **not stored in this repo** (gitignored).
> The team's QA lead holds them. This repo carries the runnable automation only.

## How to run
```bash
cd qa-regression-pack
npm install
cp .env.example .env      # optional — demo fallbacks work out of the box
npx playwright test               # full pack (uses system Edge — no browser download)
npx playwright test --grep @blocker   # release-gate subset only
npx playwright show-report
```
Coverage spans **FE (UI journeys), BE (API contracts), and DB verification** (the DB layer is
env-gated on the `CB_*` CloudBeaver-relay creds and skips cleanly when they're absent).
After a run, read **`regression-report.md`** (generated at the pack root): a GO/NO-GO release
verdict that separates NEW failures (by BLOCKER/HIGH/MEDIUM) from KNOWN open bugs, and flags
guards that look "possibly fixed".

Notes for reviewers:
- TypeScript throughout; strict `tsc --noEmit` clean. Uses the `msedge` channel (no Playwright
  browser download needed).
- Latest run: **25 pass, 1 known-fail (JF-829), 6 skipped** (SP/heir specs, transient Nafath-mock
  `ERR_ABORTED`) → verdict **GO**.
- Known open bugs are in `src/known-issues.ts`; specs affected by them are annotated so a failure
  reads as KNOWN (with its JF key), not a new regression. Review this list after each deploy.
- 6 bugs from this cycle are filed and assigned to **Saeed** (JF-1097–JF-1102); JF-1097/98/99/1100
  carry the **[DB Migration Regression]** prefix (PostgreSQL→SQL Server).

_Reviewers: @mohammadaghbar-boop (Mohammad Al-Aghbar), @Llibzo (Lina Libzo)._
