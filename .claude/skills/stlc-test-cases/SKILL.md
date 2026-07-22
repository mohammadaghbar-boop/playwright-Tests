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
Write `qa-artifacts/$story/02-$story-TestCases-AIO.csv` (story ID in the filename) in the
**working AIO format — see `${CLAUDE_SKILL_DIR}/reference/aio-format.md` and match the
`JF-759_Test_Cases_AIO.csv` template exactly.** Key points: **11 columns**
(`Test Id,Summary,Priority,TestSteps,ExpectedResults,Story,Test Type,Component,Release,Status,Creator`);
**plain UTF-8, NO BOM, LF** endings; **no quoting anywhere → no commas in any field** (rephrase
or use `;`); **one row per step** — step 1 + the expected result on the case row, extra steps
as `,,,<step>, ,,,,,,,`; `Status = NR`; `Story = $story`. (A BOM/CRLF/27-column file or any
quoted field will fail to import.) Confirm the shape against JF-759 and hand off to
`/stlc-test-case-review`.

### UI Test Guide (user-facing stories)
For any user-facing / UI-heavy story, also produce a step-by-step **UI Test Guide** at
`qa-artifacts/$story/ui-test-guide.md`, following `${CLAUDE_SKILL_DIR}/reference/ui-verification.md`.
Derive it from the ACs + the implementation analysis + gap analysis: **numbered steps per
screen/flow** (log in as role → navigate → action → capture), the **expected UI items to check**,
and **severity-tagged likely-broken/hotspot items** (`[Critical]`/`[High]`/`[Medium]`/`[Low]`) to
hunt, plus data cross-checks and a role matrix. `/stlc-run` then executes this guide, captures
screenshots **local-only** (`evidence/ui/passed/` vs `evidence/ui/issues/`), and a **hard
visual-review gate** (human reviews the screens) precedes closure.
