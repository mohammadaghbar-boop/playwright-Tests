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
