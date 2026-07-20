# QA Regression Pack — branch notes

Isolated on branch `qa/regression-pack-2026-07` (PR #18). Does **not** touch `main`, the team's
existing suite, or the STLC skills. See `README.md` for full usage and `MAINTENANCE.md` for how to
keep it synced with the app.

## Layout
```
qa-regression-pack/
  playwright.config.ts            main suite config (bundled Chromium)
  playwright.backlog.config.ts    whole-system coverage-map runner
  src/            helpers (api, login, db), known-issues registry, GO/NO-GO reporter, POM
  tests/          implemented suite, by flow area (01-auth … 09-erp-integrations)
  tests-backlog/  the whole-system map — @fe/@be/@db stub per story (809 scenarios)
```
> QA artifacts (reports, defect logs, system docs) are **local-only** and gitignored — never in the repo.

## Run
```bash
npm install
npx playwright install chromium     # first time only — bundled Chromium
npx playwright test                 # full pack → regression-report.md (GO/NO-GO)
npm run test:headed                 # watch the browser drive the app live
npm run test:gate                   # release-gate subset (@blocker)
npm run test:backlog                # the whole-system coverage map (pending stubs)
npx playwright test --grep @fe      # FE layer only  (also @be, @db)
```

## Coverage
Three layers: **FE (UI)** real-screen specs, **BE (API)** contract/RBAC specs, **DB** SELECT-only
verification via the CloudBeaver relay (env-gated on `CB_*` — runs when creds are set, skips otherwise).
ERP + public letter-verification are BE/DB-only by nature (no user screen).

_Reviewers: @mohammadaghbar-boop (Mohammad Al-Aghbar), @Llibzo (Lina Libzo)._
