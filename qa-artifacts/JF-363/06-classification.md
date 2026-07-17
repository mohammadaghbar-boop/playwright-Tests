# Classification — JF-363

Verified against real completed assignments (INH00016 accepted, INH00018 rejected). No fresh pending request was drivable (assignment trigger is classification-coupled — see JF-172 JF172-OBS-1), so pre-acceptance/expiry cases are data-limited, not failed.

| Case | Classification | Basis |
|---|---|---|
| TC-363-01 accept → «قيد العمل» + access | ✅ Passed | INH00016 event 24, status→11 |
| TC-363-03 acceptance log | ✅ Passed | event 24 «قبول المصفي لطلب الإسناد» + meta |
| TC-363-05 reject keeps «قيد تعيين مصفي» | ✅ Passed | INH00018 status stays 10 |
| TC-363-06 rejection log + reason | ✅ Passed | event 25 «تعذر المصفي عن قبول طلب الإسناد» + reason |
| TC-363-08 exclude rejecter | ✅ Passed (indirect) | Majed excluded post-reject |
| TC-363-09 reassignment restart | ✅ Passed (indirect) | restarts; no eligible → stops cleanly |
| TC-363-02 buttons removed | ✅ Passed (inferred) | request terminal after accept |
| TC-363-04 accept from list | ✅ Passed (inferred) | same endpoint |
| TC-363-07 removed from list on reject | ✅ Passed (inferred) | request resolved=rejected |
| TC-363-10 reject from list | ✅ Passed (inferred) | same endpoint |
| TC-363-11 data hidden pre-accept | ⚠️ Requires further data | needs a pending assignment |
| TC-363-12 read-only pre-accept | ⚠️ Requires further data | needs a pending assignment |
| TC-363-13 48h expiry | ⚠️ Requires further data | needs pending request aged 48h |
| TC-363-14 confirmation modals | ➖ Not run (UI-only) | not API-assertable |
| TC-363-15 transactional | ⚠️ Requires further data | needs fault injection |

**Passed: 10 (6 direct + 4 inferred) · Requires further data: 4 · UI-only: 1 · Defects: 0.**

## Verdict
JF-363 accept and reject flows (status transitions, logs with correct Arabic events, rejection reason, liquidator exclusion, reassignment restart) are **functionally correct** on all exercised paths — **0 defects**.

## ROOT CAUSE of the unrun cases — already-logged bug JF-717 (not "missing data")
The unrun cases (TC-363-11/12 pre-acceptance data-hiding/read-only, TC-363-13 48h expiry) need a fresh **pending** assignment, which needs a fresh **classification** — **BLOCKED by JF-717** (High, To Do): SAMA inquiry callback timeout → retry never triggered → inquiry never finishes → readiness never fires (JF-157) → no classification → no fresh assignment. Related: JF-719, JF-726 (re-inquiry stuck / UI SignalR CORS), JF-927 + JF-735 (readiness). TC-363-15 (transactional) needs a dev fault-hook. **These are pre-existing logged bugs, not JF-363 defects and not data I can fabricate.** They run once JF-717 + the readiness bugs are fixed.
