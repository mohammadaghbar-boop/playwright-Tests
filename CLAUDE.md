# CLAUDE.md — Infath Joint Funds automation

Guidance for Claude Code (and humans) working in this repo. Keep it short and current.

## What this is
Playwright + **TypeScript** E2E suite for the Infath Joint Funds portal, run against the
deployed **CIT/Dev** environment (`https://d-infath-jf-portal.azm-cit.com`). Standalone
Playwright project (root `package.json` / `playwright.config.ts`).

## Layout
- `Automation-Tests/` — specs + `helpers/`, `fixtures/`, `utils/` (incl. the CloudBeaver `db` relay fixture).
- `TestByAghbar/` — per-story specs organized in `JF-XXX-name/NN-*.spec.ts` folders, with `storageState` auth setup.
- `.claude/skills/` — the team's **STLC skills** (`/stlc-*`). See `.claude/skills/README.md`.

## Running tests
```bash
npm install
cp .env.example .env   # then fill values (see README); .env is gitignored — never commit it
npx playwright test Automation-Tests/<file>.spec.ts --project=chromium
```
The `db`-fixture specs also need `CB_*` env vars and network access to CloudBeaver.

## Conventions (what "good" looks like here)
- **TypeScript, strict.** `import` syntax, real types — avoid `any`.
- **Naming:** `JF-###-kebab-name.spec.ts`.
- **Selectors:** prefer `getByRole` / `getByTestId`; structural CSS/`text=` is a last resort.
- **Waits:** use web-first assertions (`await expect(locator)…`) and `locator.waitFor()`.
  Avoid `waitForTimeout(...)` and `waitForLoadState('networkidle')` — they're the main flakiness source.
- **URLs:** use `baseURL` / relative paths where available rather than hardcoding the portal URL.
- **Page objects:** put selectors/flows in page objects, not inline in specs (target state).

## House rules
- **No screenshots.** Evidence is text/logs/Playwright **traces** only (team policy, hook-enforced).
- **Secrets live in `.env`** (gitignored) — never hardcode credentials in specs or helpers.
- **Test environment only.** Never point tests at production; use the seeded demo users.
- **Parallel sessions.** We run several Claude Code sessions at once — do repo-mutating work
  on an **isolated per-task branch or git worktree**, never assume you own the working tree.

## Git / PR flow
Branch off `main` → commit → open a PR → review → merge. **Never push to `main` directly.**

## The STLC skills
The full testing lifecycle is encoded as `/stlc-*` skills (planning → gap analysis → cases →
run → classify → defect log → AIO → regression → automate → PR → closure), chained by
`/stlc-orchestrator <STORY>`. Read `.claude/skills/README.md` before running them.
