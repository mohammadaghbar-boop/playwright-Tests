---
name: stlc-run
description: Execute a story's test cases, capping each scenario at 5 minutes, capturing text/trace evidence, marking blocked scenarios for investigation, and cleaning up test data.
when_to_use: "run the test cases for JF-123", execute tests, run the suite
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Edit, Grep, Bash
---

## Execute test cases for $story

Run the approved cases from `qa-artifacts/$story/02-$story-TestCases-AIO.csv`. Prefer API-first
execution for depth/speed, but **for any user-facing story you must also confirm the
user-visible outcome in the browser** — API/DB-green does not prove the screen is correct.
Drive the real portal (msedge channel) for at least the observable result of each
user-facing flow.

**JF-portal UI gotcha:** set Playwright `trace: 'off'` for portal UI runs — the portal
holds a persistent SignalR socket open, which stalls trace-finalization on teardown (tests
pass their body, then hang to the timeout). The run log is the text evidence.

### UI / visual verification — required for user-facing stories (headless DOM is not enough)
1. If the story is user-facing / UI-heavy, a visual pass is **mandatory** (see `../stlc-test-cases/reference/ui-verification.md`).
2. Execute the story's **UI Test Guide** (`qa-artifacts/$story/ui-test-guide.md`) step by step, as each relevant role.
3. At each screen/state, `page.screenshot()` and **read the image** to verify it against the **13-area UI checklist** + the guide's expected items; cross-check on-screen data vs DB/API.
4. File screenshots **locally** (gitignored): correct screens → `evidence/ui/passed/`; anything with an issue / possible break → `evidence/ui/issues/` (with a one-line note). Never commit screenshots.
5. **Hard visual-review gate:** the human reviews the captured screens (especially `issues/`) before closure — do not sign off a user-facing story without it.

### Rules
- **5-minute cap per scenario.** If a scenario can't complete within 5 minutes (hang,
  missing data, environment block), stop it and record its result as
  **"Requires further investigation"** with the reason — then move on. One stuck case
  must never block the rest.
- **Evidence = text + traces + screenshots.** Capture request/response bodies, status codes,
  DB results, console/log output, Playwright **traces**, and — for user-facing stories —
  **screenshots** of each key screen/state. Save under `qa-artifacts/$story/evidence/`; UI
  screenshots go **local-only** (gitignored) into `evidence/ui/passed/` vs `evidence/ui/issues/`
  (isolate anything with a possible issue). **Never commit screenshots.**
- **Determinism.** Note the exact records/IDs and environment used for each case.

### Test-data cleanup (teardown)
Anything the run created must be cleaned up so re-runs are repeatable and duplicate checks
aren't tripped. Use **soft-delete `UPDATE`s** (e.g. `SET is_deleted = true`) via the DB
relay — never hard `DELETE` (the relay forbids it anyway). Clean up in a way that still
runs even if a scenario failed mid-way.

### Output
Write per-case raw outcomes to `qa-artifacts/$story/04-run-results.json` (case id,
outcome, evidence path, notes, duration). Do not classify here — that's `/stlc-classify`.
Hand off to `/stlc-results-summary`.
