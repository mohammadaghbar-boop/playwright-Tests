# Classification — JF-172

Verified against real completed assignments (INH00016 accepted, INH00018 rejected) — user-approved option 1. No fresh on-demand assignment was drivable (trigger semantics — see JF172-OBS-1), so unverified ACs are marked "Requires further data", not failed or faked.

| Case | Classification | Basis |
|---|---|---|
| TC-172-01 auto-start after rank saved | ✅ Passed | event 20→23 in ~0.3–0.55s (×2) |
| TC-172-02 only Liquidator services | ✅ Passed | only the liquidator service selected |
| TC-172-05 higher-rank escalation | ✅ Passed | rank-D estate → rank-A liquidator (×2) |
| TC-172-06 never lower rank | ✅ Passed | assigned higher, never below estate rank |
| TC-172-09 status «قيد تعيين المصفي» | ✅ Passed | status transition + sent_at_utc |
| TC-172-10 one log event 23 + View-More | ✅ Passed | event 23 «إرسال طلب تعيين للمصفي», meta present |
| TC-172-11 appears in liquidator list قبول/تعذر | ✅ Passed | liquidator accepted/rejected it |
| TC-172-13 duplicate-request guard | ✅ Passed | one active request per estate |
| TC-172-15 exclude non-accepting liquidator | ✅ Passed (indirect) | post-reject, Majed excluded → none eligible → stop |
| TC-172-16 no-eligible stops cleanly | ✅ Passed (indirect) | no error, no wrong assignment |
| TC-172-04 same-rank-first | ⚠️ Requires further data | needs a rank-D liquidator |
| TC-172-03 inactive excluded | ⚠️ Requires further data | needs an inactive liquidator service |
| TC-172-07 workload priority | ⚠️ Requires further data | needs ≥2 same-rank liquidators |
| TC-172-08 tie-break next-in-queue | ⚠️ Requires further data | needs 2 equal-workload liquidators |
| TC-172-12 no rank → no start | ⚠️ Requires further data | needs a rank-less classified estate |
| TC-172-14 48h timeout → reassignment | ⚠️ Requires further data | needs a request aged past 48h |

**Passed: 10 · Requires further data: 6 · Defects: 0.**

## Observation (not a defect)
**JF172-OBS-1:** assignment is coupled to a fresh classification-save and fires sub-second; `workflow/start` on an already-classified estate does not re-fire it. Expected semantics. Documented for the closure report; will NOT be filed as a bug (confirmed via the event20→event23 timing on real data).

## ROOT CAUSE of the unrun cases — already-logged bug JF-717 (not "missing data")
The unrun cases all need a fresh **pending** assignment, which needs a fresh **classification**, which is **BLOCKED by JF-717** (High, To Do): *SAMA inquiry callback times out, `ack_status` stays S1000000, `retry_attempt=0`, retry never triggered* → the SAMA inquiry never "finishes" → per JF-157 readiness only fires when all 5 inquiries finish → readiness never runs → no classification → no assignment. Verified live: the stuck estates sit with SAMA status 5 / retryAttempt 0. Related already-logged bugs: JF-719 (same SAMA no-retry), JF-726 (manual re-inquiry stuck — UI SignalR CORS on d-infath-a-ws.azm-cit.com), JF-542; readiness-correctness JF-927 + JF-735 (on JF-157). **These pre-existing bugs — not a JF-172 defect and not a data gap I can fabricate — are why TC-03/04/07/08/12/14 are unrun.** They will run once JF-717 (+ the readiness bugs) are fixed and the pipeline can classify a fresh estate. To provision the extra liquidator services is still doable, but useless until JF-717 unblocks a fresh assignment.

**Verdict: JF-172 functionally correct on all exercised paths; 0 defects. Remaining gaps are data/environment, not product.**
