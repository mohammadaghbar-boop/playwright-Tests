---
name: stlc-orchestrator
description: Run the full STLC pipeline for one user story, end to end, invoking each phase skill in order and pausing at defined human gates. The backbone for automating the whole STLC.
when_to_use: "run the full STLC for JF-123", do the whole testing process for a story, end-to-end testing
argument-hint: "[JF-XXX]"
arguments: [story]
disable-model-invocation: true
---

## Full STLC run for $story

Drive the whole lifecycle for **$story** by invoking each phase skill in order. Do the work
of each phase (don't just announce it), carry artifacts forward via `qa-artifacts/$story/`,
and **stop at every human gate** for explicit approval before continuing.

### Pipeline
1. `/stlc-test-planning $story` — plan + entry-criteria check. **Stop if entry criteria fail.**
2. `/stlc-gap-analysis $story` — analyze; draft gap comment. **✋ GATE: user approves the comment before it is posted to Jira.**
3. `/stlc-test-cases $story` — author Happy/Unhappy/Edge cases → AIO CSV.
4. `/stlc-test-case-review $story` — checklist review. **✋ GATE: user approves cases (or loop back to step 3).**
5. `/stlc-env-setup $story` — provision + verify access/data.
6. `/stlc-run $story` — execute (5-min cap/scenario, text/trace evidence, cleanup).
7. `/stlc-results-summary $story` — summarize.
8. `/stlc-classify $story` — investigate + final classifications.
9. `/stlc-defect-log $story` — Failed/Gap → **✋ GATE: user approves defects before Jira creation.**
10. `/stlc-aio-update $story` — **✋ GATE: user confirms mapping before updating the live AIO cycle.**
11. `/stlc-regression $story` — run affected existing specs.
12. `/stlc-automate $story` — write + verify the Playwright/TS spec (must be green).
13. `/stlc-sync-pr $story` — **✋ GATE: user approves; isolated branch/worktree → push → PR.**
14. `/stlc-closure $story` — final report/metrics/lessons; **✋ GATE: user approves the Jira story transition.**

### Artifacts (canonical filenames — the single source of truth)
Each phase reads the previous phase's file by an **exact, fixed name**. Use these names
verbatim; do **not** invent or renumber artifacts per run — a later phase reads the fixed
name and silently drifts if an earlier phase inserts an extra numbered file.

| Phase | Skill | File in `qa-artifacts/$story/` |
|---|---|---|
| 0  | test-planning     | `00-test-plan.md` |
| 1  | gap-analysis      | `01-gap-comment.md` |
| 2  | test-cases        | `02-test-cases-AIO.csv` |
| 3  | test-case-review  | *(gate verdict shown inline — optional notes in `03-test-case-review.md`, which must NOT push later numbers)* |
| 4  | env-setup         | `03-env-check.md` |
| 5  | run               | `04-run-results.json` (+ `evidence/`) |
| 6  | results-summary   | `05-results-summary.md` |
| 7  | classify          | `06-classification.md` |
| 8  | defect-log        | updates `06-classification.md` with defect keys |
| 9  | aio-update        | `07-aio-update.csv` |
| 10 | regression        | `08-regression.md` |
| 11 | automate          | the spec file (under the suite, not `qa-artifacts/`) |
| 12 | closure           | `09-closure-report.md` |

### Rules
- **Human gates are mandatory** — never post to Jira/AIO or push code without the user's OK.
  (Automating these gates away is the future goal; today they stay manual.)
- **Parallel-session safe** — everything repo-mutating happens on an isolated per-story
  branch/worktree (step 13), so other concurrent sessions are never disturbed.
- **No screenshots**, ever — evidence is text/logs/traces.
- **Resumable** — if invoked when some artifacts already exist in `qa-artifacts/$story/`,
  detect the last completed phase and continue from there rather than redoing work.
- Between phases, give a one-line status ("Phase N done → next") so the user can follow.
- If a phase is blocked, stop and report exactly what's needed rather than faking progress.
- **Search before you block or file.** Before calling a phase blocked or raising a defect,
  read the story's linked/mentioned issues **and their comments**, JQL-search Jira for the
  same symptom, and check the mock server + its swagger + the concrete error codes / DB
  status values. If a matching bug already exists, **link it** (is-blocked-by / relates-to)
  — never file a duplicate. Do the digging *before* concluding, not after being pushed to.
- **Re-verify the environment live, every run — it drifts.** DB migrations (e.g.
  Postgres→SQL Server), data wipes, and parallel sessions change the ground under you.
  Never trust prior artifacts or memory for env facts; probe reachability, creds (by
  presence, never value), endpoints, and the actual fixture/data state at env-setup.
- **Never DB-force invalid work.** If the real product flow can't produce a case's
  precondition, the case is **blocked** (usually by a logged bug), not a pass. Timestamp-
  aging for time-based ACs (48h) is a legitimate technique; forging classifications or
  domain results directly in the DB is not.
- **Test the FE/UI, not just the API/DB — for every user-facing story.** API/DB-green proves
  the backend, not the user's screen. Each user-facing story must be verified at the browser
  layer (list/detail rendering, status labels, entity names, control states): add UI cases in
  test-cases, run them in the browser, and automate at least the observable outcome. API-first
  is for depth; the FE layer is not optional.

### Lessons carried from the JF-844 test-drive (2026-07)
- **Verify findings at the layer the user experiences before filing.** Two API-level
  "defects" (missing status text, un-masked national id) were **refuted at the UI** — the
  front end rendered both correctly. Confirm on the real page/PDF before raising a bug.
- **Manufacture missing test data through the real product flow.** When the env has no
  usable fixture (e.g. zero issued letters) and the DB relay is read/UPDATE-only, create it
  via the actual product path, record the IDs as a **reusable fixture**, and schedule
  cleanup at closure — don't fake the result or skip the positive cases silently.
- **Know the Jira MCP limits.** There is **no delete/edit-comment tool** — retract a wrong
  comment by posting a superseding reply. Jira wiki mention syntax `[~accountid:…]` is
  **escaped to literal text** by `addCommentToJiraIssue`, so it is not a real @mention;
  rely on the **assignee** for notification, or confirm the mention actually renders.
- **Verify the spec in isolation.** An unrelated break elsewhere (e.g. a stray `*/` inside a
  `playwright.config.ts` comment, or a browser `globalSetup` the API-only spec doesn't need)
  can stop *every* test from running. Run the target spec via a minimal/scoped config so
  unrelated config/setup breakage can't block or mask a genuine green.
- **Keep the artifact names on the map above** — the JF-844 run drifted its own file numbers
  by inserting an extra `03-` file; the map is now authoritative.

### Lessons carried from the JF-172 / JF-363 / JF-927 test-drive (2026-07)
- **Exhaust the search before declaring a blocker — the bug is usually already logged.** A
  "pipeline is broken, can't create data" wall turned out to be an already-filed High bug
  (SAMA callback timeout → retry never triggered). The path that found it: read the two
  upstream stories' **linked issues + every comment**, then JQL-search bugs by symptom.
  Concrete drill: `linkedIssues in (STORY) OR (project = JF AND issuetype = Bug AND text ~
  "sama callback")`. When found, mark the case **Blocked by** that bug and link it — don't
  invent a new "environment" bug and don't call it "needs data".
- **Root-cause the *mechanism* before naming the cause.** Two wrong first guesses on this
  run: an assignment that "wouldn't re-fire" was **expected semantics** (it's coupled to a
  fresh classification-save and fires ~0.5s later — `workflow/start` on an already-classified
  estate is a no-op), not a defect; and a "missing SAMA callback key" was wrong — the mock
  was **up** and returned data directly; the real cause was the logged retry bug. Verify the
  mechanism (timings, DB status transitions, direct mock probes) before you attribute cause.
- **Only test what the story scopes; named stakeholders are authoritative.** PO/dev comments
  ("attachment not part of this story", "notifications … intentionally not included") *are*
  the scope — quote them, drop those ACs, and don't test them. Conversely, before reporting a
  story as under-covered, confirm the unrun cases map to **explicit ACs** (they did here — so
  "Blocked" was correct, not "done").
- **When on-demand triggering is gated, verify ACs against real completed records.** An
  already-accepted estate and an already-rejected estate were valid, sufficient evidence for
  the accept/reject/log/exclusion ACs. Label each result **directly-observed** vs **inferred**.
- **Automation must be inclusive and future-proofed.** Put blocked ACs in the spec as
  ready-to-run `test.fixme`, each tagged to its AC **and** the blocking bug (e.g.
  `@blocked-JF717`), with the required setup/fixtures documented in-line, so they auto-run
  once the blocker clears. Positives skip cleanly when fixtures are absent. Prefer API-first
  assertions on observable, persistent state (e.g. the estates list carrying `liquidatorName`).
- **Closure = the status the evidence supports + full traceability.** Transition to **Blocked**
  only for a real dev-fixable blocker; a story is **not** a clean pass if defined ACs are
  unverified. Link *every* related defect with the correct type (is-blocked-by for blockers,
  relates-to for related) and post a per-story comment that **enumerates the exact unverified
  ACs and why**. Reuse a mistakenly-opened bug when the team asks, rather than creating a new one.
- **Branch/PR gotchas.** A ref named `test` blocks any `test/…` branch (git dir/file
  conflict) — use a `qa/…` prefix. gh auth via the GCM token piped through `GH_TOKEN`.
- **Persist and extract large tool outputs.** Oversized Jira/API responses: save to file and
  slice with `jq`/node, don't dump into context.
- **The FE was the gap — cover it as a first-class layer.** JF-172/363 first shipped with
  API/DB-only specs; the estate manager's actual screen (assigned liquidator name; status
  «حصر التركة» after accept vs «اسناد التركة» after reject) was never exercised until a
  browser spec closed it. JF-portal Playwright gotchas: **`trace: 'off'`** (a persistent
  SignalR socket stalls trace-finalization on teardown — tests pass their body then hang to
  the timeout, truncated trace.zip; run log = evidence; `DEBUG=pw:api` isolates it); supply
  **`baseURL`** (POMs are relative); run via a **scoped config that skips the Nafath
  `globalSetup`**; **explore-then-assert** the real DOM before writing selectors. Verify
  read-only against real evidence records when the action is blocker-gated.
