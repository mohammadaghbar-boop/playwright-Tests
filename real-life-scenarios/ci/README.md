# CI for the Real-Life Scenarios Pack

`qa-packs.yml` is a **reference** workflow. GitHub Actions only runs workflows under
`.github/workflows/`, so to activate it:

1. Copy `qa-packs.yml` to the repo root at `.github/workflows/real-life-scenarios.yml`
   (on the branch you want it to run from — e.g. this branch, or `main` after merge).
2. Add the repo **secrets** below (Settings → Secrets and variables → Actions).

## Triggers
- **Nightly** (`cron` 02:00 UTC), **manual** (`workflow_dispatch`), and **PRs** touching `real-life-scenarios/**`.

## Secrets
| Secret | Needed for | Notes |
|---|---|---|
| `JF_BASE_URL`, `JF_BASE_API_URL` | optional | override the CIT defaults baked into `src/helpers/users.ts` |
| `CB_BASE_URL`, `CB_USERNAME`, `CB_PASSWORD`, `CB_CONNECTION_NAME`, `CB_DATABASE` | **DB layer** | without them the `@db` tests skip cleanly; with them they run. See `tools/ENABLE-DB-VERIFICATION.md`. |

## What you get
Every run uploads `regression-report.md` (the **GO/NO-GO** verdict — new vs known failures) and the
Playwright HTML report as artifacts. The job uses `continue-on-error` on the test step so a *known*
open-bug failure never red-fails CI; the report is the source of truth.

> Demo credentials are the well-known CIT demo accounts (same as the local run). No production
> secrets belong here.
