# Test Closure — JF-363 (Liquidator: Accept/Reject assignment request)

**Final status: BLOCKED** (transitioned in Jira; comment 58715). **0 defects in JF-363 itself.**

## Coverage (15 cases)
- **Passed: 10** (6 direct + 4 inferred) — accept → «قيد العمل» + acceptance log «قبول المصفي لطلب الإسناد»; reject (with reason) keeps «قيد تعيين مصفي» + rejection log «تعذر المصفي عن قبول طلب الإسناد»; rejecter excluded; reassignment restart; accept/reject from list; not-assigned-on-reject. Verified against INH00016 (accept) + INH00018 (reject).
- **Blocked: 4** (all explicit ACs) — pre-acceptance sensitive-data-hidden (TC-11), read-only pre-accept (TC-12), 48h expiry (TC-13), transactional/no-partial-update (TC-15).

## Blockers (linked in Jira)
- **is blocked by JF-717** + **JF-927** — no fresh *pending* assignment (needs a fresh classification), so pre-acceptance and 48h-expiry ACs can't be exercised.
- **relates to JF-719, JF-726, JF-735.**
- TC-15 (transactional) additionally needs a dev fault-injection hook.

## Scope (confirmed authoritative)
Notifications (email + in-app) and exhaustion/escalation OUT (Raouf); authorization-letter download deferred (JF-172/Saeed).

## Automation
`Automation-Tests/JF-363-assignment-response.spec.ts` — API-first guards (accept persists, reject leaves pending), verified green; 4 blocked ACs included as ready-to-run `test.fixme`. PR #19.

## FE / UI coverage (added 2026-07-19)
The accept/reject **outcomes** are now verified in the browser via `Automation-Tests/JF-172-363-liquidator-assignment-ui.spec.ts` (msedge, POM). Distinct FE rendering for the two paths, confirming the earlier UI-only case and the accept/reject results at the layer the user sees:
- **Accept (INH00016):** estate detail exposes liquidator **Majed ALQAHTANI**; list status «حصر التركة» (in-work).
- **Reject (INH00018):** list shows **no active liquidator** and status «اسناد التركة» (back to assignment); detail carries no liquidator name.

**3/3 FE tests green** (`ui-run.log`). The interactive accept/reject *button* action needs a fresh **pending** request → still gated by JF-717 (unchanged), so that remains a `test.fixme` in the API spec.

## Metrics
Cases 15 · Passed 10 · Blocked 4 · UI-only 1 · Defects (JF-363) 0 · Blocking bugs 2 (JF-717, JF-927) + 3 related.
