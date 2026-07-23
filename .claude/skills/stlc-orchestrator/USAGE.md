# Running `/stlc-orchestrator` — step by step

How to run the full STLC pipeline for one story. The "safe way" here = giving each run
its **own git worktree**, so multiple concurrent Claude Code sessions never collide.

## 0. Prerequisites (one-time)
- **The skills must be in the repo you open** — they live in `.claude/skills/`. If this
  branch isn't merged to `main` yet, use it directly (the worktree step below does that).
- **Claude Code** open with the repo as its working directory; **accept the workspace-trust
  prompt** on first launch (required for skills + pre-approved tools).
- **`.env` filled in** (`cp .env.example .env`, then real values) — needed by env-setup/run.
- **Jira (Atlassian) connected** in that session — used by gap-analysis, defect-log, closure.

## 1. Make an isolated worktree (safe for parallel sessions)
```bash
# from your existing playwright-Tests clone:
git fetch origin
git worktree add ../pw-stlc-test -b test/stlc-orchestrator origin/feature/stlc-skills
cd ../pw-stlc-test
npm install
cp .env.example .env      # then fill in values
```
> Once `feature/stlc-skills` is merged, use `origin/main` instead of `origin/feature/stlc-skills`.

## 2. Open a SEPARATE terminal + SEPARATE Claude Code chat
Point that new session at `../pw-stlc-test`. It is now fully isolated from your other sessions.
> For any interactive login inside the chat (e.g. `gh auth login`), prefix it with `!` so it
> runs in-session: `! gh auth login`.

## 3. Run the orchestrator
```
/stlc-orchestrator JF-172
```
(swap `JF-172` for the real story ID.)

It runs the 14 phases in order and **stops at 6 human gates** for your explicit approval:

| Gate | You approve before… |
|---|---|
| Gap comment | it is posted to Jira |
| Test cases | they are imported to AIO |
| Defects | Jira bugs are created |
| AIO update | the cycle is updated |
| PR | code is pushed |
| Story transition | the Jira status changes |

Handoff files land in `qa-artifacts/JF-172/` (plan, gap comment, cases CSV, results,
classification, closure report).

## 4. Run a single phase instead (optional)
```
/stlc-gap-analysis JF-172
```
Any phase works standalone with the same `JF-XXX` argument.

## 5. Clean up when done
```bash
cd ../playwright-Tests
git worktree remove ../pw-stlc-test
```

## Notes
- **UI stories require visual verification** — screenshots are evidence, stored **locally only** (gitignored, never committed); non-UI evidence is text/logs/traces.
- If `/stlc-…` doesn't autocomplete: you're not in a repo that has `.claude/skills/` (wrong
  folder/branch), or trust wasn't accepted — re-open in `../pw-stlc-test`.
