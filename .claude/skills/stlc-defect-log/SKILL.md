---
name: stlc-defect-log
description: For Failed/Gap test cases, create a Jira defect linked to the story, with reproduction steps and text/trace evidence. User-invoked only (writes to Jira).
when_to_use: "log the defects", raise bugs for failed cases, file defects for JF-123
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Grep
disable-model-invocation: true
---

## Log defects for $story

Read `qa-artifacts/$story/06-classification.md`. For each **Failed** and **Gap** case that
doesn't already have a defect, prepare a Jira bug.

### Draft first, then create on approval
For each defect draft: a clear **summary**, **steps to reproduce** (from the test case),
**expected vs actual**, **environment/record IDs**, and **evidence** (paths to text/trace
evidence — never screenshots). Group cases that share one root cause into a single defect.

Show the drafts to the user. **Human gate:** only after approval, use the Jira MCP:
- `createJiraIssue` (Bug) in the correct project,
- `createIssueLink` to link each defect to **$story** (e.g. "relates to" / "blocks"),
- record the created defect key back into `qa-artifacts/$story/06-classification.md`
  next to its case (so `/stlc-aio-update` and `/stlc-closure` can reference it).

Never open duplicates — check whether a matching defect already exists first.
