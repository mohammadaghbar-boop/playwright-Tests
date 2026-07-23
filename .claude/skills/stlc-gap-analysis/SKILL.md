---
name: stlc-gap-analysis
description: Do a gap analysis on a user story from its Jira details, linked issues, and comments; then DRAFT a gap-summary comment for review before it is posted.
when_to_use: "gap analysis for JF-123", analyze a story, find gaps in a user story
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Grep
---

## Gap analysis for $story

### 1. Gather everything about the story
Use the Atlassian (Jira) MCP tools to fetch the full picture of **$story**:
- The issue itself (description, acceptance criteria, status, fields).
- **All linked issues** (blocks, relates to, epics, sub-tasks) — fetch their details too.
- **All comments** on the story and relevant linked issues.
- **Related stories beyond the direct links** — the epic, sibling stories in the same
  feature, and downstream consumers; search Jira by feature/component to find them and read
  enough to understand how $story fits and where its edges are.
- **The feature's source code** (read-only) — read the implementation to spot gaps between
  what the story *requires* and what's *built*. Requirements are authoritative: if the code
  diverges from the story, that's a gap/defect to note, not the source of truth. **Never
  modify source code.**

If any tool isn't available/authorized, say so and ask the user to enable it — don't guess.

### 2. Analyse for gaps
Identify the **real gaps** — be concrete and evidence-based:
- Acceptance criteria that are ambiguous, missing, contradictory, or untestable.
- Behaviour implied by comments/linked tickets but absent from the story.
- Missing edge/negative-case definition, unclear data/permission rules, undefined error
  handling, or dependencies on unfinished work.
- Distinguish **product gaps** (feature unclear/incomplete) from **coverage gaps**
  (things we must be sure to test).

### 2a. Produce an implementation analysis (from the code)
From the pulled BE + FE source, write a short analysis alongside the gaps: **feature summary**,
**technical summary** (APIs, DB changes, background jobs, integrations, feature flags),
**undocumented / hidden business rules** inferred from the code, **discrepancies between the
story and the implementation**, **regression impact** (features/modules that could be
affected), and **bug-prone areas**. Approach it adversarially — the aim is to surface defects
and risks, not to confirm the ACs.

### 3. Draft the gap comment (do NOT post yet)
Write a clear, professional Jira comment summarizing the real gaps to
`qa-artifacts/$story/01-gap-comment.md`. Then show it to the user and ask them to review.

**Human gate:** only after the user approves do you post it, via the Jira MCP
`addCommentToJiraIssue` on $story. If the user edits it, post their version. Never post
without explicit approval.

> Note: the Jira MCP has **no delete/edit-comment tool**. Once a comment is posted it can
> only be retracted by a superseding reply — so post it right the first time, and keep the
> draft in `01-gap-comment.md` so re-posting/superseding is easy if the story evolves.
