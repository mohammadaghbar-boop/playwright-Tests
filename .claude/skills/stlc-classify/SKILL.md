---
name: stlc-classify
description: Investigate ambiguous results and assign each test case a final classification — Passed, Failed, Gap, Not Applicable, or Requires dev support.
when_to_use: "classify the results", determine pass/fail/gap for JF-123
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Edit, Grep, Bash
---

## Classify results for $story

Start from `qa-artifacts/$story/05-results-summary.md`. For every case — especially the
"Requires further investigation" ones — do the investigation needed to reach a confident
final classification (re-run, inspect DB/API, compare against acceptance criteria). Use the
**source code as a helper** to root-cause the mechanism (real status transitions, evaluation
order, error branches) — read-only. Judge every case against the **acceptance criteria as the
authority**: if the code does X but the story requires Y, that's **Failed**, not Passed.
Never modify source to make a case pass.

### Classification taxonomy (see `${CLAUDE_SKILL_DIR}/reference/classification.md`)
- **Passed** — behaves per the acceptance criteria; verified with evidence.
- **Failed** — product behaves incorrectly vs a clear acceptance criterion. → defect.
- **Gap** — the criterion/behaviour is undefined or the feature is incomplete (not a
  wrong-behaviour bug, but missing/unclear). → defect or story clarification.
- **Not Applicable** — the case doesn't apply to the current build/config/scope.
- **Requires dev support** — can't be tested even with all the access we have (needs a
  specific backend config or test-data creation only devs can do). Say exactly what's needed.

Write the final classification (case id → class + justification + evidence link) to
`qa-artifacts/$story/06-classification.md`. This drives `/stlc-defect-log` (Failed/Gap) and
`/stlc-aio-update`.
