# JF Regression Testing Pack

Post-deployment regression suite for the Infath Joint Funds portal (CIT).
Self-contained Playwright + TypeScript project, organized **by flow** (not by story),
per the team's restructure direction: shared login, feature-ordered folders.

## What it is for
Run after every deployment. It answers: **"is the system safe to release?"**
- Specs tagged `@blocker` cover the flows that must never break (login, estate backbone,
  liquidator assignment). Any failure here = deployment NO-GO.
- Specs tagged `@high` / `@medium` catch regressions that should be raised as defects with
  that priority but do not block a release by themselves.
- Known open bugs live in `src/known-issues.ts`; specs affected by them are annotated so a
  failure caused by a known issue is reported as KNOWN (with its JF key), not as a new defect.

## Structure
```
tests/
  01-auth/                  internal login, Nafath SP login, external login routing
  02-admin/                 users, roles, task management, flow maps
  03-sp-lifecycle/          facility registration → services → PD review
  04-estate-core/           estates list, estate file tabs, inquiries, financial totals
  05-heirs/                 heirs admission, disclosures
  06-assets-classification/ asset readiness, estate classification, control panel
  07-liquidator/            assignment request/response, correspondence, legal, inquiries
  08-public/                QR letter verification (no auth)
src/
  fixtures/  auth fixtures (per-role storageState, cached like the main repo)
  pages/     page objects
  helpers/   nafath login recipe, env, API client
  reporting/ priority reporter → regression-report.md grouped by priority
```

## Running
```bash
npm install                      # uses its own package.json
cp .env.example .env             # optional; PD demo fallback works without it
npm install && npx playwright install chromium   # first time only (bundled Chromium)
npx playwright test              # full pack (bundled Chromium)
npm run test:headed              # watch the browser drive the app
npm run test:backlog             # run the whole-system coverage map (809 scenarios, pending stubs)
npx playwright test --grep @blocker   # release-gate subset only
npx playwright show-report
```
After a run, read `regression-report.md`: NEW failures grouped by priority, KNOWN failures
listed with their JF bug keys.

## House rules honored
- TypeScript strict, getByRole/getByTestId-first selectors, web-first assertions.
- No screenshots (traces only), secrets via .env, CIT environment only.
- Local-only for now — NOT pushed to the repo (per instruction). To adopt into the repo,
  copy this folder in and merge the config's projects into the root playwright.config.ts.
