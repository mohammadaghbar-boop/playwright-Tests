---
name: stlc-orchestrator
description: Run the full STLC pipeline for one user story, end to end, invoking each phase skill in order and pausing at defined human gates. The backbone for automating the whole STLC.
when_to_use: "run the full STLC for JF-123", do the whole testing process for a story, end-to-end testing
argument-hint: "[JF-XXX]"
arguments: [story]
disable-model-invocation: true
---

## Full STLC run for $story

Drive the whole lifecycle for **$story** by invoking each phase skill in order. Do the work
of each phase (don't just announce it), carry artifacts forward via `qa-artifacts/$story/`,
and **stop at every human gate** for explicit approval before continuing.

### Pipeline
1. `/stlc-test-planning $story` — plan + entry-criteria check. **Stop if entry criteria fail.**
2. `/stlc-gap-analysis $story` — analyze; draft gap comment. **✋ GATE: user approves the comment before it is posted to Jira.**
3. `/stlc-test-cases $story` — author Happy/Unhappy/Edge cases → AIO CSV.
4. `/stlc-test-case-review $story` — checklist review. **✋ GATE: user approves cases (or loop back to step 3).**
5. `/stlc-env-setup $story` — provision + verify access/data.
6. `/stlc-run $story` — execute (5-min cap/scenario, text/trace evidence, cleanup).
7. `/stlc-results-summary $story` — summarize.
8. `/stlc-classify $story` — investigate + final classifications.
9. `/stlc-defect-log $story` — Failed/Gap → **✋ GATE: user approves defects before Jira creation.**
10. `/stlc-aio-update $story` — **✋ GATE: user confirms mapping before updating the live AIO cycle.**
11. `/stlc-regression $story` — run affected existing specs.
12. `/stlc-automate $story` — write + verify the Playwright/TS spec (must be green).
13. `/stlc-sync-pr $story` — **✋ GATE: user approves; isolated branch/worktree → push → PR.**
14. `/stlc-closure $story` — final report/metrics/lessons; **✋ GATE: user approves the Jira story transition.**

### Artifacts (canonical filenames — the single source of truth)
Each phase reads the previous phase's file by an **exact, fixed name**. Use these names
verbatim; do **not** invent or renumber artifacts per run — a later phase reads the fixed
name and silently drifts if an earlier phase inserts an extra numbered file.

| Phase | Skill | File in `qa-artifacts/$story/` |
|---|---|---|
| 0  | test-planning     | `00-test-plan.md` |
| 1  | gap-analysis      | `01-gap-comment.md` |
| 2  | test-cases        | `02-test-cases-AIO.csv` |
| 3  | test-case-review  | *(gate verdict shown inline — optional notes in `03-test-case-review.md`, which must NOT push later numbers)* |
| 4  | env-setup         | `03-env-check.md` |
| 5  | run               | `04-run-results.json` (+ `evidence/`) |
| 6  | results-summary   | `05-results-summary.md` |
| 7  | classify          | `06-classification.md` |
| 8  | defect-log        | updates `06-classification.md` with defect keys |
| 9  | aio-update        | `07-aio-update.csv` |
| 10 | regression        | `08-regression.md` |
| 11 | automate          | the spec file (under the suite, not `qa-artifacts/`) |
| 12 | closure           | `09-closure-report.md` |

### Rules
- **Human gates are mandatory** — never post to Jira/AIO or push code without the user's OK.
  (Automating these gates away is the future goal; today they stay manual.)
- **Parallel-session safe** — everything repo-mutating happens on an isolated per-story
  branch/worktree (step 13), so other concurrent sessions are never disturbed.
- **No screenshots**, ever — evidence is text/logs/traces.
- **Resumable** — if invoked when some artifacts already exist in `qa-artifacts/$story/`,
  detect the last completed phase and continue from there rather than redoing work.
- Between phases, give a one-line status ("Phase N done → next") so the user can follow.
- If a phase is blocked, stop and report exactly what's needed rather than faking progress.

### Lessons carried from the JF-844 test-drive (2026-07)
- **Verify findings at the layer the user experiences before filing.** Two API-level
  "defects" (missing status text, un-masked national id) were **refuted at the UI** — the
  front end rendered both correctly. Confirm on the real page/PDF before raising a bug.
- **Manufacture missing test data through the real product flow.** When the env has no
  usable fixture (e.g. zero issued letters) and the DB relay is read/UPDATE-only, create it
  via the actual product path, record the IDs as a **reusable fixture**, and schedule
  cleanup at closure — don't fake the result or skip the positive cases silently.
- **Know the Jira MCP limits.** There is **no delete/edit-comment tool** — retract a wrong
  comment by posting a superseding reply. Jira wiki mention syntax `[~accountid:…]` is
  **escaped to literal text** by `addCommentToJiraIssue`, so it is not a real @mention;
  rely on the **assignee** for notification, or confirm the mention actually renders.
- **Verify the spec in isolation.** An unrelated break elsewhere (e.g. a stray `*/` inside a
  `playwright.config.ts` comment, or a browser `globalSetup` the API-only spec doesn't need)
  can stop *every* test from running. Run the target spec via a minimal/scoped config so
  unrelated config/setup breakage can't block or mask a genuine green.
- **Keep the artifact names on the map above** — the JF-844 run drifted its own file numbers
  by inserting an extra `03-` file; the map is now authoritative.
