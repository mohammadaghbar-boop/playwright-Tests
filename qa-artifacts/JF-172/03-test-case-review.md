# Test-Case Review — JF-172

Reviewed `02-test-cases-AIO.csv` (16 cases) against the story ACs, Saeed's scope confirmation, and the gap comment.

| Checklist item | Result |
|---|---|
| Categories present | ✅ Happy (01,02,04,09,10,11), Unhappy (03,06,12,13,16), Edge (05,07,08,14,15) |
| ACs covered (in-scope only) | ✅ auto-start (01,12), liquidator-role filter (02), active-only (03), same-rank (04), escalation (05), never-lower (06), workload (07), tie-break (08), status «قيد تعيين المصفي» (09), one log entry (10), appears in liquidator list (11), duplicate guard (13), 48h timeout+exclusion (14,15), no-eligible stop (16) |
| Letter ACs excluded | ✅ correctly omitted — out of scope per Saeed |
| Classification-derivation excluded | ✅ JF-171's scope; no B/C/NA cases |
| Steps concrete/executable | ✅ (API/DB-first; several cases need extra liquidator services provisioned — flagged) |
| Priorities sane | ✅ core selection/status/log/dup = High |
| Valid AIO CSV | ✅ 11 cols, 16 cases, Status=NR, Story=JF-172 |

**Data dependencies (for env-setup):**
- TC-07/08 (workload, tie-break) need **≥2 eligible same-rank liquidator services** — only one real liquidator (Majed, rank A) exists → likely **partially blocked** unless more are provisioned.
- TC-03 needs an **inactive** liquidator service; TC-06/16 need a rank arrangement with **no eligible** liquidator.
- TC-14/15 (48h timeout, exclusion) via **DB timestamp manipulation**.

**Verdict: Approved for execution.** Proceed to env-setup; expect TC-07/08 (and possibly 03/06/16) to be data-limited given a single real liquidator — will mark those "Requires further data/dev" rather than fake.
