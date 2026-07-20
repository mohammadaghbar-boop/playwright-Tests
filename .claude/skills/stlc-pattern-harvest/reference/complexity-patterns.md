# Complexity patterns — learned heuristics for handling hard stories

Maintained by `/stlc-pattern-harvest`. Each entry: **signal → approach → example → phases**.
These are **heuristics, not overrides** — the user story / AC is always the authority, and the
house rules always apply. Seeded from the JF-171/172/363/927 test-drives; grow it by harvesting
new patterns from past testing chats and from each closed story.

## Search before you block
- **Signal:** a phase looks blocked ("pipeline broken, can't create data").
- **Approach:** read the story's linked issues + all comments, then JQL-search bugs by
  symptom before declaring a blocker; link the existing bug (is-blocked-by) instead of filing
  a duplicate.
- **Example:** JF-172/363 — the wall was the already-logged JF-717 (SAMA retry).
- **Phases:** gap, env, run, classify.

## Root-cause the mechanism before naming the cause
- **Signal:** a result "looks wrong" or an action "won't fire".
- **Approach:** verify timings, DB status transitions, and direct mock probes before
  attributing cause; distinguish expected semantics from a defect.
- **Example:** JF-172 assignment "won't re-fire" was expected (coupled to a fresh
  classification-save), not a bug.
- **Phases:** classify, defect-log.

## Async pipeline with background jobs
- **Signal:** the outcome depends on N background inquiries or a job processor (e.g. Hangfire).
- **Approach:** confirm the processor is alive (heartbeats, recent succeeded jobs) before
  blaming it; find the one gating step (e.g. a single stuck SAMA inquiry) rather than assuming
  the whole pipeline is dead.
- **Example:** JF-927 readiness never firing traced to one stuck inquiry, not a dead worker.
- **Phases:** env, run, classify.

## Test the layer the user sees
- **Signal:** a user-facing story verified only at the API/DB.
- **Approach:** add a browser (POM) check of the observable outcome; explore-then-assert the
  real DOM; on the JF portal set `trace:'off'` (a persistent SignalR socket stalls trace
  finalization on teardown).
- **Example:** JF-172/363 FE spec (liquidator name + status rendering).
- **Phases:** cases, run, automate.

## Requirements vs mock/code divergence
- **Signal:** the mock or code can't produce a state the story assumes (e.g. REGA never
  returns أرض خام).
- **Approach:** treat the story/AC as authority; mark the unreachable path blocked/gated with
  evidence and note the mock/config gap — don't relax the expected result to match the code.
- **Example:** JF-927 Ready branch unreachable via the REGA mock.
- **Phases:** gap, cases, classify.

## Verify gated ACs against real completed records
- **Signal:** on-demand triggering of a state is blocked, but records already in that state
  exist.
- **Approach:** verify the AC against a real already-in-state record (e.g. an already-accepted
  and an already-rejected estate); label each result directly-observed vs inferred; keep the
  interactive action as a `test.fixme` tagged to the blocker.
- **Example:** JF-363 accept/reject verified against INH00016 / INH00018.
- **Phases:** run, classify, automate.
