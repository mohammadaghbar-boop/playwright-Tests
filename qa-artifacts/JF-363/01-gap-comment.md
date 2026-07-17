# Gap Comment (POSTED) — JF-363

---

**QA gap analysis — JF-363 (Liquidator: Accept/Reject assignment request)**

Reviewed the story, its 9 (Done) sub-tasks, linked issues, and the thread ahead of testing. Building on the earlier QA open-questions comment; confirming scope and readiness.

**Confirmed scope (authoritative):**
- **Notifications (email + in-app) are OUT of scope** — Raouf: "Notifications (in-app/email) … intentionally not included." QA will not test notification ACs.
- **Exhaustion / escalation-to-manager (all liquidators excluded) is OUT of scope** — Raouf (and thread).
- **Rejection reason IS included** and recorded in the inheritance log — Mohammad Abu Ghoush.
- **Authorization-letter download** depends on the letter, which is **deferred per JF-172** (Saeed: "attachment not part of this story") — so the letter-download AC is not exercised in this pass.

**Readiness:**
- Blocker **JF-946** (authGuard blocked dual ServiceProvider+Liquidator from reaching the case) is now **Ready For UAT** — the end-to-end accept/reject path is reachable again.
- Precondition met: assigned estates exist at the pending stage.

**In scope for this QA pass:** accept (status → «قيد العمل», full data access, buttons removed, acceptance log), reject (optional reason + confirmation, status stays «قيد تعيين مصفي», removed from liquidator list, liquidator excluded, reassignment restart, rejection log with reason), read-only + sensitive-data-hidden before acceptance, 48h expiry, accept/reject from both list and details, transactional (no partial updates).

**Notes (flagging, not blocking):** the boundary items from the earlier QA comment (rejection-reason max length/validation, 48h boundary inclusive vs exclusive) remain product decisions; 48h-expiry will be exercised via controlled timestamp aging. QA will verify accept/reject against the real completed assignments already in CIT.

— QA (Ahmad)
