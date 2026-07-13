---
name: stlc-sync-pr
description: Ship a story's automation the safe way — sync latest main, work in an isolated per-story branch/worktree (parallel-session safe), commit, push, open a PR. Never pushes to main.
when_to_use: "push the automation", open a PR for JF-123, commit and PR the spec
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Grep, Bash
disable-model-invocation: true
---

## Sync & PR the automation for $story

Correct order (pull first, push last, never straight to main):

1. **Sync** — fetch and check the latest `main`.
2. **Isolate** — because we run multiple Claude Code sessions at once, do NOT reuse the
   shared working tree. Create a dedicated **branch** `feature/$story-automation` (or a git
   **worktree** for this story) off the latest `main`. This prevents concurrent sessions
   from clobbering each other.
3. **Verify** — confirm the new spec is green (or intentionally skipped with reasons) —
   `/stlc-automate` should have done this; re-check.
4. **Commit** — a focused commit with a conventional message. End the message with the
   repo's required `Co-Authored-By` trailer.
5. **Rebase check** — pull/rebase `main` again in case teammates merged while you worked;
   resolve conflicts.
6. **Push & PR** — push the branch and open a PR into `main` with a description of what was
   automated, coverage, and links to the story/defects. Give the user the PR link.

**Human gate:** this writes to the shared remote — only run when the user invokes it.
Report the PR URL; do not merge.
