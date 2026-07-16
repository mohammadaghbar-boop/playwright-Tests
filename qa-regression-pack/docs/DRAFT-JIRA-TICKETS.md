# Draft Jira Tickets — ready to file after review

> **FILED 2026-07-16** (per user instruction) — the 6 confirmed-live defects are now in Jira:
> | Local | Jira | Priority |
> |---|---|---|
> | T8-NEW (site-config 500s) | **JF-1097** | Highest |
> | T1 (task deactivate 500) | **JF-1098** | High |
> | T2 (task delete 500) | **JF-1099** | High |
> | T4 (AVM per-asset null, partial fix) | **JF-1100** | High |
> | T9 (Marjea zero vehicles) | **JF-1101** | Medium |
> | T10 (inquiry recipient-close no-op) | **JF-1102** | High |
>
> **All 6 assigned to Saeed (2026-07-16, per user).** Titles of JF-1097/1098/1099/1100 prefixed
> **"[DB Migration Regression]"** (PostgreSQL→SQL Server) — backend/persistence-layer failures.
> JF-1101 NOT prefixed (Marjea provider returns success+0 items — provider/mock-side, not JF DB) and
> JF-1102 NOT prefixed (pure frontend — confirm handler fires no request). Label `qa-cycle-2026-07`.
> Still held (liquidator-role gate): T5/T6/T7/T12/T13. Dropped: T3, T8, T11, AREAF-N2.

One ready-to-paste ticket per confirmed defect (13 total after AREAF-N2 was closed as
not-a-bug). Each will get a **fresh "still reproduces as of <date>" stamp** from the
re-verification round before filing — do NOT file any marked FIXED by that round
(see `results/reverify-api-defects.md` / `reverify-ui-defects.md`).

Conventions: Project **JF**, Type **Bug**, Environment line included, labels `qa-cycle-2026-07`.
Severity/Priority are QA assessments — adjust during triage.

> ⚠ **HOLD on the asset tickets (T5, T6, T7, T12, T13) and the wizard ticket (T8)** —
> user directive 2026-07-16: these were found while exercising the liquidator-facing
> add-asset flow (JF-393) through the EstateManager role/API, because no liquidator
> account existed at the time. Once the liquidator account build completes, they MUST
> be re-tested through the real liquidator UI/role; any that don't reproduce there are
> **not valid bugs** (role artifacts) and will be dropped, not filed. Final verdicts
> pending the post-liquidator retest.
> **RESOLVED by the liquidator-role retest (2026-07-16) — NONE of the five will be filed.**
> The retest found the reverify used the WRONG endpoint: `POST /cases/api/v1/assets` (flat) is
> not called by the UI — no validation/dedup/audit by design. The real AssetCreate form calls
> `POST /cases/api/v1/assets/for-case/{caseId}`, which enforces full server-side validation and an
> assigned-liquidator RBAC gate (`FORBIDDEN_NOT_ASSIGNED_LIQUIDATOR`). Verdicts:
> - **T12 (N4 audit), T13 (N5 no-validation), T5-part (N3 list-invisibility)** → **ROLE-ARTIFACT, DROPPED** — real endpoint validates/audits correctly; FE form blocks empty submit ("هذا الحقل مطلوب").
> - **T6 (N1 dup deed), T7 (N2 dup serial)** → **NOT-REACHABLE, HELD (do not drop)** — the real endpoint gates on an assigned liquidator; liquidator 1100000011 has zero assigned estates and the assignment pipeline is currently stalled (fresh estates INH00014/00015 stall at classification, never emit an assignment request). Re-test dedup once assignment works.
> Detail: `results/liquidator-asset-retest.md`.

---

## T1 ← AREAA-N1 ✅ re-verified STILL-REPRODUCES (2026-07-16, fresh task TSK-00079; PUT body `{"status":2}` → 500 via UI and API)
**Summary:** [Task Management] Deactivate task fails with HTTP 500 INTERNAL_ERROR
**Priority:** High · **Severity:** High · **Linked story:** JF-152
**Environment:** CIT — d-infath-jf-portal.azm-cit.com / d-infath-jf-api.azm-cit.com
**Steps:**
1. Log in to the internal portal as SystemAdmin (admin@infath.sa via demo panel).
2. Open إدارة المهام (Task Management).
3. Open the kebab (⋮) menu on any task → إلغاء التفعيل → confirm.
**Expected:** Task transitions to deactivated (JF-152 AC).
**Actual:** `PUT /tasks/api/v1/task-definitions/{id}/status` → **500** `{"errorCode":"INTERNAL_ERROR","errorMessage":"حدث خطأ داخلي"}`; task stays فعالة. Reproduced on draft AND published tasks.

## T2 ← AREAA-N2 ✅ re-verified STILL-REPRODUCES (2026-07-16, DELETE on freshly-created TSK-00079 → 500; GET-after still active)
**Summary:** [Task Management] Delete task fails with HTTP 500; task is not soft-deleted
**Priority:** High · **Severity:** High · **Linked story:** JF-153
**Environment:** CIT
**Steps:**
1. SystemAdmin → إدارة المهام → kebab on a task → حذف → confirm.
**Expected:** Task soft-deletes (status محذوفة).
**Actual:** `DELETE /tasks/api/v1/task-definitions/{id}` → **500 INTERNAL_ERROR**, toast "حدث خطأ داخلي"; row unchanged. Reproduced on 2 tasks.

## ~~T3 ← AREAC-N3~~ — FIXED, DO NOT FILE (re-verified 2026-07-16)
INH00011 is now status 9 with event 8 "تم رفض التركة لعدم تحقق متطلبات العمل" (03:36Z today) —
the work-requirements rejection now fires. **Residual minor:** `rejectionMetaData` is still
null; if JF-244's AC requires rejection metadata, raise separately as a **Low** ticket:
"Work-req rejection event recorded but rejectionMetaData is null".

## T4 ← AREAC-N1 ⚠ re-verified CHANGED — PARTIAL FIX (2026-07-16); update scope before filing
**Summary:** [AVM/Valuation] Per-asset AVM valuation still never stored (estimatedValue null on all RE assets); estate-level total now populated only on some estates
**Priority:** High · **Severity:** High · **Linked story:** JF-247
**Environment:** CIT
**Steps:**
1. Create an estate with real-estate assets (e.g. INH00005/INH00006).
2. After the automatic Paseetah AVM inquiry, inspect RE assets and estate totals.
**Expected:** AVM value stored per RE asset; estate "القيمة التقديرية للتركة" populated consistently.
**Actual (as of 2026-07-16 re-verification):** per-asset `estimatedValue` is **still null on every RE asset**. Estate-level `estimatedEstateValue` is now populated on INH00005 (8.97M) / INH00009 (6.23M) / INH00010 (1.645M) — all were null earlier today — but **INH00006 / INH00007 remain null**. So: partial fix in flight; per-asset storage and consistency across estates still defective.

## T5 ← AREAE-N3
**Summary:** [Assets] Manually-added assets never appear in the estate assets list (grouped endpoint)
**Priority:** High · **Severity:** High · **Linked story:** JF-393 (AC17)
**Environment:** CIT
**Steps:**
1. `POST /cases/api/v1/assets` a valid asset (any type) for an estate → 200, asset id returned.
2. `GET /cases/api/v1/assets/by-case/{caseId}/grouped`.
**Expected:** The created asset appears in the list.
**Actual:** 0 of 15 created assets appear, though each is retrievable by GET-by-id (persisted but omitted from the list — not a lag).

## T6 ← AREAE-N1
**Summary:** [Assets] Duplicate real-estate deed number accepted within the same estate (AC15/BR4 not enforced)
**Priority:** High · **Severity:** High · **Linked story:** JF-393
**Environment:** CIT
**Steps:**
1. POST a real-estate asset with deedNumber X to estate E → 200.
2. POST another RE asset with the same deedNumber X to estate E.
**Expected:** Second rejected as duplicate.
**Actual:** Both return 200 — duplicate created.

## T7 ← AREAE-N2
**Summary:** [Assets] Duplicate vehicle serial number accepted within the same estate (AC16/BR5 not enforced)
**Priority:** High · **Severity:** High · **Linked story:** JF-393
**Steps/Expected/Actual:** As T6 but with `serialNumber` on vehicle assets — both accepted (200).

## ~~T8 ← AREAB-N1~~ — DEBUNKED, DO NOT FILE (2026-07-16)
The liquidator-build run re-drove the wizard carefully and **all 6 steps work end-to-end**.
Root cause of the earlier false positive: `lib-datepicker` does not commit a *typed*
`YYYY-MM-DD` value — you must open the calendar and **click a day cell**, after which the
value commits and "التالي" enables (with amount typed + both mandatory PDFs uploaded).
Closed as an automation-interaction gap, not a product bug.
*(Optional UX note for the BA, not a bug ticket: typed dates being ignored is a usability
paper-cut worth mentioning.)*

## T8-NEW ← LIQBUILD-N1 (replaces T8)
**Summary:** [Platform] All /platform/api/v1/site-config/* keys return 500 — blocks T&C content and the service-registration final submit
**Priority:** Highest · **Severity:** Critical · **Linked story:** JF-564 onboarding chain; related to JF-829 (same site-config route, previously ERR_ABORTED — likely same root-cause family)
**Environment:** CIT
**Steps:**
1. Complete the service-registration wizard steps 1–6 as an approved facility's SP.
2. Click the final "تسجيل الخدمة" submit — the UI first fetches `GET /platform/api/v1/site-config/service-registration:terms-and-conditions`.
3. Also GET any other key: privacy-notice, facility T&C, general:terms.
**Expected:** Site-config content returns 200; submit proceeds to the service-creation POST.
**Actual:** **HTTP 500** `{"errorCode":"INTERNAL_ERROR","errorMessage":"خطأ في الخادم الداخلي"}` on **every** site-config key (3× reproduced). The service-creation POST never fires → **liquidator onboarding is blocked at the last step**. Site-config store appears broken/unseeded post-migration.

## T9 ← AREAC-N2 ✅ re-verified STILL-REPRODUCES (2026-07-16, INH00007 → `{status:4, returnedVehicleCount:0}`; no manual re-trigger endpoint exposed)
**Summary:** [Marjea] Vehicle valuation inquiry succeeds but returns zero vehicles for estates with vehicles
**Priority:** Medium · **Severity:** High · **Linked story:** JF-677
**Steps:**
1. Estate with vehicle assets (e.g. INH00007, 2 vehicles) → automatic Marjea inquiry.
2. `GET /cases/api/v1/court-cases/{id}/marjea-inquiry`.
**Expected:** Vehicle price predictions returned/stored.
**Actual:** `status: 4 (succeeded)` but `returnedVehicleCount: 0` — no valuation produced.

## T10 ← AREAF-N1 ✅ re-verified STILL-REPRODUCES — caveat REMOVED, solid bug (2026-07-16)
**Summary:** [Inquiries] Recipient close (→ مغلقة) does not complete — confirm button fires no request
**Priority:** High · **Severity:** High · **Linked story:** JF-893
**Steps:**
1. As the RECIPIENT of an inquiry (verified on INQ-2026-000002 AND a fresh INQ-2026-000018, recipient = RM) open it → إغلاق.
2. Enter the mandatory reason → click the enabled إغلاق confirm.
**Expected:** Inquiry closes with status مغلقة + reason.
**Actual:** **Zero API requests fire** (full network capture), no JS errors, the panel silently dismisses, and after reload the status is still قيد التنفيذ / بانتظار الرد. The creator path on the same fresh inquiry works (`POST /cases/api/v1/tickets/{id}/complete` → 200 → مكتملة), proving the click technique — the original automation caveat is removed; this is a genuine frontend defect (confirm handler not wired on the recipient path).

## ~~T11 ← AREAA-N3~~ — FIXED, DO NOT FILE (re-verified 2026-07-16)
Every roles-list row now has a `data-testid="role-view-action"` (عرض) eye action opening
`/user-management/roles/{id}` with the read-only permission matrix (0 editable controls;
`GET /users/api/v1/roles/{id}` → 200). The defect no longer exists.

## T12 ← AREAE-N4
**Summary:** [Assets/Audit] No "تم إضافة أصل" event recorded in the estate events log on asset creation
**Priority:** Medium · **Severity:** Medium · **Linked story:** JF-393 (AC18)
**Steps:** Add an asset to an estate → open سجل التركة.
**Expected:** "Asset added" audit event per the fixed audit format.
**Actual:** No event recorded.

## T13 ← AREAE-N5
**Summary:** [Assets/API] Backend accepts assets with no asset type / missing mandatory fields (defensive validation gap)
**Priority:** Low · **Severity:** Medium · **Linked story:** JF-393 (AC3/AC11/BR8)
**Steps:** `POST /cases/api/v1/assets` with `assetType: 0` and مصدر=أخرى without description.
**Expected:** 400 validation error.
**Actual:** Accepted — only `Description` is enforced server-side.
**Note:** may be FE-enforced; file as backend hardening.

---

## Candidate — needs your call before filing (found during liquidator retest)
**CAND-1:** The liquidator's own "add asset" button routerLinks to the internal route
`/court-cases/{id}/assets/new`, which the ServiceProvider auth-guard redirects away — so the
add-asset form is **unreachable through the liquidator UI** even with a live assignment.
Likely same family as JF-946 (SP-subtree route missing/misrouted). Not auto-filed — tell me to
file it (I'd assign Saeed; frontend/routing, no DB-migration prefix) or fold it into JF-946.

## Not being filed (for the record)
- **AREAF-N2** — closed **not-a-bug**: Nafath registration is the intended liquidator onboarding (verified working end-to-end).
- **AREAA-N4** — environment issue (stale PD demo credential), route to env/config owners, not a product bug.
- **AREAA-N5** — spec-divergence on JF-143 (missing "رقم الدور" filter) — confirm requirement with BA first.
