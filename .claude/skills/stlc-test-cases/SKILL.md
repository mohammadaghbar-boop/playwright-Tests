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
the test plan (`qa-artifacts/$story/00-test-plan.md`) if present. Read the feature's
**source code** (read-only) to make steps and expected results accurate to real behaviour
(endpoints, statuses, validation branches) — but keep the **story / AC as the authority**.
For high-complexity stories, apply the heuristics in the patterns library
(`/stlc-pattern-harvest`).

### Coverage — all three categories, explicitly
- **Happy path** — the feature working as intended, main flows.
- **Unhappy path** — invalid input, wrong permissions, rejected actions, error states.
- **Edge cases** — boundaries, empty/max data, concurrency, timeouts, unusual sequences.

**Cover the layer the user sees.** For any user-facing story, include explicit **FE/UI
cases** (browser), not only API/DB — every user-visible outcome (list/detail rendering,
status labels, entity names, enabled/disabled controls) gets at least one UI case.
API-green ≠ the user's screen is correct.

**Design against the full coverage taxonomy** (production-readiness mindset — hunt for
defects, don't just confirm ACs). Cover every applicable dimension, and **mark any as N/A
with a reason** rather than skipping silently: functional, negative, boundary-value, input
validation, error handling, permissions / role-based access, security, auth & session, API
behaviour, DB & data integrity, audit logs, notifications, background jobs, third-party
integrations, state transitions, navigation, search / filter / sort / pagination, large
datasets, empty states, concurrency, performance, UX behaviour (not just element
visibility), and regression. Derive scenarios from the **implementation analysis** produced
in `/stlc-gap-analysis` — especially undocumented business rules and bug-prone areas.

Each case: a **Title beginning with "Verify"**, a clear description, a **Risk level**
(Critical/High/Medium/Low) that also drives Priority, **Preconditions**, **Test Data**, and
numbered **step-by-step** actions each with its **own expected result**. Steps must be
concrete enough that someone else could execute them without asking you.

### Traceability
Map every case to the acceptance criterion or gap it covers. Note any AC with **no** case
(a coverage gap) and add cases until every AC is covered.

### Export to AIO CSV
Write `qa-artifacts/$story/02-$story-TestCases-AIO.csv` (story ID in the filename) in AIO's
**native import format — see `${CLAUDE_SKILL_DIR}/reference/aio-format.md` and match it
exactly.** Key points: the **27-column** AIO schema (`S.NO.,Key,Version,Title,Description,
Pre-condition,…,Steps,Data,Expected Result,…,Priority,Status,Type,…`); **one row per case**
with all steps in a single numbered `Steps` cell and matching numbered `Expected Result`
cell (**not** one row per step); leave `Key` blank (AIO assigns it); write the file as
**UTF-8 with BOM and CRLF** line endings (a no-BOM/LF file is exactly what previously failed
to import). Validate the encoding and, ideally, a trial import; then hand off to
`/stlc-test-case-review`.
