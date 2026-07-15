---
name: stlc-run
description: Execute a story's test cases, capping each scenario at 5 minutes, capturing text/trace evidence, marking blocked scenarios for investigation, and cleaning up test data.
when_to_use: "run the test cases for JF-123", execute tests, run the suite
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Edit, Grep, Bash
---

## Execute test cases for $story

Run the approved cases from `qa-artifacts/$story/02-test-cases-AIO.csv`. Prefer API-first
execution where it's cheaper/more reliable; use the UI where the case requires it.

### Rules
- **5-minute cap per scenario.** If a scenario can't complete within 5 minutes (hang,
  missing data, environment block), stop it and record its result as
  **"Requires further investigation"** with the reason — then move on. One stuck case
  must never block the rest.
- **Evidence = text only.** Capture request/response bodies, status codes, DB query
  results, console/log output, and Playwright **traces**. **Never take screenshots**
  (team policy). Save evidence under `qa-artifacts/$story/evidence/`.
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
