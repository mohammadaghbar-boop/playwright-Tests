---
name: stlc-results-summary
description: Produce a clear summary of a story's test execution results from the raw run output — counts, per-case outcomes, and what needs investigation.
when_to_use: "summarize the test results", results summary for JF-123
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Grep
---

## Summarize execution results for $story

Read `qa-artifacts/$story/04-run-results.json` (and evidence). Produce a concise, honest
summary to `qa-artifacts/$story/05-results-summary.md`:

- **Headline counts** — total, completed, blocked / requires-investigation.
- **Per-case table** — Test Id, Summary, raw outcome, evidence link, one-line note.
- **Requires-investigation list** — each with the reason it was capped/blocked, so
  `/stlc-classify` knows what to dig into.
- **Environment** — portal/env, records/IDs used, run timestamp.

Be realistic — never inflate results or mark something passed you didn't actually verify.
This summary feeds `/stlc-classify`; it is not the final report (that's `/stlc-closure`).
