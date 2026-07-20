---
name: stlc-test-cases
description: Write detailed step-by-step test cases (Happy / Unhappy / Edge) for a story and export them as an AIO-importable CSV, with traceability to acceptance criteria.
when_to_use: "write test cases for JF-123", author test cases, generate AIO CSV
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Grep
---

## Author test cases for $story

Base them on the story + the gap analysis (`qa-artifacts/$story/01-gap-comment.md`) and
the test plan (`qa-artifacts/$story/00-test-plan.md`) if present.

### Coverage — all three categories, explicitly
- **Happy path** — the feature working as intended, main flows.
- **Unhappy path** — invalid input, wrong permissions, rejected actions, error states.
- **Edge cases** — boundaries, empty/max data, concurrency, timeouts, unusual sequences.

**Cover the layer the user sees.** For any user-facing story, include explicit **FE/UI
cases** (browser), not only API/DB — every user-visible outcome (list/detail rendering,
status labels, entity names, enabled/disabled controls) gets at least one UI case.
API-green ≠ the user's screen is correct.

Each case: a clear **Summary**, a **Priority** (High/Medium/Low), numbered **step-by-step
TestSteps**, and a precise **ExpectedResult**. Steps must be concrete enough that someone
else could execute them without asking you.

### Traceability
Map every case to the acceptance criterion or gap it covers. Note any AC with **no** case
(a coverage gap) and add cases until every AC is covered.

### Export to AIO CSV
Write `qa-artifacts/$story/02-test-cases-AIO.csv` in the exact AIO import format — see
`${CLAUDE_SKILL_DIR}/reference/aio-format.md`. Key points: columns
`Test Id,Summary,Priority,TestSteps,ExpectedResults,Story,Test Type,Component,Release,Status,Creator`;
multi-step cases put each extra step on its own row with **only the TestSteps column**
filled; `Status = NR` (Not Run); `Story = $story`. Confirm the row count matches the
number of cases and hand off to `/stlc-test-case-review`.
