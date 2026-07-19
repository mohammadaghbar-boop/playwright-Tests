# Test Plan — JF-363

**Story:** المصفي: قبول/رفض طلب الإسناد / Liquidator: Accept/Reject the assignment request
**Type:** Story · **Status:** QA · **Link:** https://saudiazmco.atlassian.net/browse/JF-363
**Run env:** CIT · worktree `pw-jf172` on skills `f8f9d9c`.

## 1. Scope (in)
Liquidator response to an assignment request: **Accept** (status → «قيد العمل», full data access, buttons removed, acceptance log «قبول المصفي لطلب الإسناد»); **Reject/تعذر** (optional reason, confirmation, status stays «قيد تعيين مصفي», removed from liquidator list, **liquidator excluded**, reassignment restarts, rejection log «تعذر المصفي عن قبول طلب الإسناد» with reason); **read-only + sensitive-data-hidden before acceptance**; **48h expiry**; accept/reject from **both** the list and the details page; transactional (no partial updates).

## 2. Out of scope (authoritative confirmations)
- **Notifications (email + in-app): OUT** — Raouf Adel Zueter: "Notifications (in-app/email) … intentionally not included."
- **Exhaustion / escalation-to-manager when all liquidators excluded: OUT** — Raouf (and confirmed in the thread).
- **Authorization-letter download AC:** the letter/attachment itself is deferred per JF-172 (Saeed: "attachment not part of this story"), so letter generation/download is not exercised here.

## 3. Environment & data (real evidence available)
- **Accept path:** INH00016 — assigned to Majed (NID 1100000011), `req_status=2` accepted, responded_at recorded.
- **Reject path:** INH00018 — assigned to Majed, `req_status=3` rejected, reason recorded, event 25 «تعذر المصفي عن قبول طلب الإسناد».
- Endpoints (FE court-case service): `POST …/court-cases/{id}/assignment/accept {}`, `POST …/assignment/reject {reason}`.
- DB relay (SQL Server `[Case]`): LiquidatorAssignmentRequests (status/responded_at/rejection_reason), CaseEvents (accept/reject events), CourtCases (status). Liquidator token via Nafath (regression-pack/.auth/liquidator.json).

## 4. Entry criteria
| Check | Result |
|---|---|
| ACs present | ✅ full accept/reject/expiry/data-hiding/log specs |
| Precondition (assigned estate at «قيد تعيين مصفي») | ✅ INH00016/INH00018 evidence + drivable |
| Blocker JF-946 (authGuard) | ✅ now **Ready For UAT** (was the hard blocker) |
| Sub-tasks | ✅ all 9 dev sub-tasks Done |
| Scope decisions | ✅ notifications + exhaustion out (Raouf); reason in (Mohammad) |

**Verdict: READY.** Accept + reject verifiable against real completed data; data-hiding checkable via API (liquidator view pre-accept); 48h-expiry needs timestamp manipulation (flag if not drivable); transactional/UI-modal are confirmatory.

## 5. Approach
API/DB-first: verify accept (INH00016) and reject (INH00018) outcomes + logs against `LiquidatorAssignmentRequests`/`CaseEvents`/status; probe pre-acceptance data-hiding by reading the case as the liquidator before acceptance; attempt 48h-expiry via DB timestamp aging. No screenshots. Notifications/exhaustion excluded per scope.
