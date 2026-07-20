---
name: stlc-test-case-review
description: Review a story's drafted test cases against a quality checklist before they are imported to AIO and executed. A gate, not a rewrite.
when_to_use: "review the test cases", check cases before AIO import
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Grep
---

## Review test cases for $story

Read `qa-artifacts/$story/02-$story-TestCases-AIO.csv` (and the story/gap analysis). Run this
checklist and report a concise pass/fix list — do **not** silently rewrite the author's cases.

**Checklist**
- [ ] All three categories present: Happy, Unhappy, Edge.
- [ ] Every acceptance criterion has at least one covering case (traceability). List any AC with none.
- [ ] Steps are concrete and executable by someone else, in order, with real data references.
- [ ] Each ExpectedResult is specific and objectively verifiable (not "works correctly").
- [ ] No duplicates; no case that actually tests two things (split them).
- [ ] Priorities are sane (critical flows = High).
- [ ] CSV is valid AIO format (header, multi-step rows, `Status=NR`, correct `Story`).
- [ ] Negative/permission cases use the right non-authorized role/user.

**Human gate:** end with either **"Approved for import"** or a numbered list of required
fixes. If fixes are needed, hand back to `/stlc-test-cases`. Only approved cases proceed to
`/stlc-env-setup` and `/stlc-run`.
