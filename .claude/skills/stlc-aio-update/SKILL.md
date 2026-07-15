---
name: stlc-aio-update
description: Update the AIO Test cycle with a story's final classifications. Produces the update sheet and applies it via AIO API if available; user-invoked only.
when_to_use: "update AIO", update the test cycle results for JF-123
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Grep, Bash
disable-model-invocation: true
---

## Update the AIO test cycle for $story

Read `qa-artifacts/$story/06-classification.md`. Map each case's final classification to the
AIO cycle status.

1. **Always** produce an update sheet `qa-artifacts/$story/07-aio-update.csv` (Test Id →
   final status + linked defect key where relevant) so the update is reviewable and can be
   applied manually if needed.
2. **If an AIO API/integration is configured**, apply the updates programmatically and
   report exactly what changed. If not, tell the user the sheet is ready for manual import
   and stop — do not pretend it was applied.

**Human gate:** confirm the mapping with the user before applying anything to the live AIO
cycle. Never mark a case in AIO as passed unless `/stlc-classify` classified it Passed with
evidence.
