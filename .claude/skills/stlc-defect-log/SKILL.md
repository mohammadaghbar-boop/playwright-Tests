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
  next to its case (so `/stlc-aio-update` and `/stlc-closure` can reference it),
- **comment on $story** enumerating the bugs raised from it — each defect key, a one-line
  summary, and its link — so the story itself records what testing produced. (Same Jira-write
  gate; post only after approval.)

Never open duplicates — check whether a matching defect already exists first.

### Before you file: confirm at the delivery layer
A finding seen only at the API can be **refuted by the UI** — the front end may render or
mask something the raw response omits. Verify each candidate defect on the actual
page/PDF/card the user sees before filing; drop the ones the UI handles correctly. (In the
JF-844 run, two of three API "defects" were refuted this way.)

### Jira MCP limits (learned the hard way)
- There is **no delete/edit-comment tool**. If a comment must be retracted, post a
  **superseding reply** that withdraws it (reference the old comment id) rather than trying
  to delete it.
- `addCommentToJiraIssue` **escapes the wiki mention syntax `[~accountid:…]` to literal
  text** — it does not produce a real @mention or notification. To notify someone, set them
  as **assignee** (that notifies), or confirm the mention actually rendered.
- Reusing an existing placeholder issue is fine (overwrite summary/description via
  `editJiraIssue`), but read its current state first so you don't clobber real content.
