# STLC Skills — the team's standard testing lifecycle, as Claude Code skills

These skills encode our **Software Testing Life Cycle** so every engineer runs the
same process the same way, for any user story. Each skill is one phase. They can be
run individually (`/stlc-<name> JF-123`) or chained end-to-end by the
**orchestrator** (`/stlc-orchestrator JF-123`).

> Goal: these are the building blocks for **fully automating the STLC** (leadership's
> near-term goal). The orchestrator is that automation's backbone — today it pauses at
> human gates; over time those gates can be opened as confidence grows.

## The pipeline (order)

| # | Skill | Phase | Human gate? |
|---|-------|-------|:-:|
| 0 | `/stlc-test-planning` | Scope, risk, entry criteria, environment identification | |
| 1 | `/stlc-gap-analysis` | Read story + linked issues + comments → gap analysis → **draft** gap comment | ✋ post after review |
| 2 | `/stlc-test-cases` | Step-by-step Happy/Unhappy/Edge cases → AIO-importable CSV (+ traceability) | |
| 3 | `/stlc-test-case-review` | Review/checklist the cases before AIO import | ✋ approve |
| 4 | `/stlc-env-setup` | Provision mock data, DB relay, endpoints, `.env`; verify reachable | |
| 5 | `/stlc-run` | Execute cases (5-min cap/scenario), capture evidence, clean up test data | |
| 6 | `/stlc-results-summary` | Summarize execution results | |
| 7 | `/stlc-classify` | Classify each: Passed / Failed / Gap / Not Applicable / Requires dev support | |
| 8 | `/stlc-defect-log` | For Failed/Gap → create linked Jira defect | ✋ side-effect |
| 9 | `/stlc-aio-update` | Update the AIO test cycle with final results | ✋ side-effect |
| 10 | `/stlc-regression` | Run affected existing specs to catch collateral breakage | |
| 11 | `/stlc-automate` | Write Playwright/TS automation from the final working steps; verify green | |
| 12 | `/stlc-sync-pr` | Pull/sync → isolated branch/worktree → commit → PR | ✋ side-effect |
| 13 | `/stlc-closure` | Final report + metrics + lessons; transition story; exit criteria | |
| — | `/stlc-orchestrator` | Runs the whole pipeline for one story ID, pausing at every ✋ | |
| — | `/stlc-pattern-harvest` | Meta/continuous: extract reusable testing patterns from past testing chats into a library the orchestrator + judgment phases consult (esp. high-complexity stories) | |

## House rules baked into every skill
- **No screenshots.** Evidence is text/logs/Playwright traces only (team policy, hook-enforced).
- **Human gates are explicit.** Anything that writes to Jira/AIO or pushes code is
  `disable-model-invocation` — it only runs when you invoke it, never auto-triggered.
- **Parallel-session safe.** We run up to ~3 Claude Code sessions at once, so any
  repo-mutating step uses an **isolated git worktree/branch per story** — never the
  shared working tree. See `/stlc-sync-pr`.
- **Test environment.** Everything targets the CIT/Dev portal
  (`https://d-infath-jf-portal.azm-cit.com`) and its seeded demo users — never production.

## How to share / adopt
These live in `.claude/skills/` committed to this repo. Teammates get them automatically
on `git clone` + first `claude` run (accept the workspace-trust prompt). To reuse them in
the **QA AI Platform**, the markdown bodies are portable — strip the Claude-specific
frontmatter and keep the instructions.

## Conventions
- Story ID is the single argument to most skills: `/stlc-gap-analysis JF-172`.
- Skills read/write shared artifacts under `qa-artifacts/<STORY>/` (gap analysis,
  test-case CSV, results, classification, closure report) so phases hand off cleanly.
