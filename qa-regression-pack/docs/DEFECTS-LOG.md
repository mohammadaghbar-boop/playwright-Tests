# JF Test Cycle — Defect Log (2026-07-16)

These are **locally-documented defects** raised during the autonomous JF test cycle (six functional areas A–F) run against the CIT/Dev environment. **They are NOT filed in Jira** — this log is the working record for triage. Severity/Priority are a QA **assessment** (standard scale Blocker/Critical/High/Medium/Low) inferred from impact, not values from a tracker.

**Originally 16 items; after review, 13 confirmed product defects.** During one-by-one review with the user, **AREAF-N2 was reclassified as NOT A BUG** (2026-07-16) — Nafath-only login with first-time registration is the intended liquidator onboarding flow. The remaining non-product items are one environment/credential issue (**AREAA-N4**) and one spec-divergence finding (**AREAA-N5**), kept for completeness. Area D raised **no** new defects.

**Review status:** ✅ AREAF-N2 = not a bug (by design; Nafath registration verified working E2E). ✅ AREAB-N1 = **debunked** (wizard works; datepicker needs a day-cell click — automation artifact). 🆕 **LIQBUILD-N1 added** (site-config 500s — Critical, blocks liquidator onboarding at final submit).

**API re-verification (2026-07-16, `results/reverify-api-defects.md`):**
- STILL-REPRODUCES: AREAA-N1, AREAA-N2 (both re-proven on a fresh task, incl. exact PUT body `{"status":2}`), AREAC-N2, AREAE-N1..N5 (re-proven on INH00012).
- **FIXED:** AREAC-N3 — INH00011 now rejected (event 8, status 9); residual: `rejectionMetaData` still null (candidate Low ticket).
- **CHANGED (partial fix):** AREAC-N1 — estate-level `estimatedEstateValue` now populated on 3 estates (8.97M/6.23M/1.645M) but null on INH00006/07, and per-asset `estimatedValue` still null everywhere.
- Bonus: task-definition create now returns proper 201 (unlike the JF-1059 pattern).
**UI re-verification (2026-07-16, `results/reverify-ui-defects.md`):**
- **FIXED:** AREAA-N3 — roles list now has a `role-view-action` (عرض) opening the read-only permission matrix.
- **STILL-REPRODUCES (caveat removed — solid):** AREAF-N1 — recipient إغلاق fires ZERO API requests (full capture, no JS errors) on INQ-2026-000002 and fresh INQ-2026-000018, while the creator path works on the same inquiry (`POST /tickets/{id}/complete` → 200). Genuine frontend defect.

**Liquidator-role asset retest (2026-07-16, `results/liquidator-asset-retest.md`) — RESOLVES AREAE-N1..N5:**
Key discovery: two asset-create endpoints. `POST /cases/api/v1/assets` (flat) is NOT used by the UI — no validation/dedup/audit by design (this is what the reverify hit). The real form calls `POST /cases/api/v1/assets/for-case/{caseId}` — full validation + assigned-liquidator RBAC gate.
- **DROPPED (role/endpoint artifacts):** AREAE-N3 (list-invisibility), AREAE-N4 (no audit event), AREAE-N5 (no validation) — the real endpoint validates & audits correctly; FE blocks empty submit.
- **HELD, not dropped (NOT-REACHABLE):** AREAE-N1 (dup deed), AREAE-N2 (dup serial) — real endpoint gates on an assigned liquidator; NID 1100000011 has zero assigned estates and the assignment pipeline is stalled (fresh estates stall at classification). Re-test dedup once assignment works.
- **Incidental (candidate CAND-1, not filed):** liquidator "add asset" button routerLinks to internal `/court-cases/{id}/assets/new`, bounced by the ServiceProvider guard → add-asset unreachable via liquidator UI (likely JF-946 family).
**NET: 0 of the 5 asset defects filed.** The retest prevented 3+ invalid filings — the user's "liquidator-role gate" rule worked as intended.

Pre-existing Jira bugs the testers merely re-confirmed (FAIL-KNOWN) are **not** counted here — they are listed in **Appendix A**. Bugs that now appear fixed are in **Appendix B**.

---

## Summary table

| ID | Area | Title | Severity | Priority | Related JF story/bug | Status |
|---|---|---|---|---|---|---|
| AREAA-N1 | A — Internal Admin | Task deactivate returns HTTP 500 | High | High | JF-152 | Open (local, not in Jira) |
| AREAA-N2 | A — Internal Admin | Task delete returns HTTP 500 | High | High | JF-153 | Open (local, not in Jira) |
| AREAA-N3 | A — Internal Admin | Roles list has no View/row action (blocks view-role-details) | Medium | Medium | JF-128 (cf. JF-450) | Open (local, not in Jira) |
| AREAA-N4 | A — Internal Admin | Documented PD fallback credential is stale (401) | Low | Medium | helpers/auth.ts (env; no JF) | Open (local, not in Jira) |
| AREAA-N5 | A — Internal Admin | Roles list missing spec'd "رقم الدور / Role Number" filter | Low | Low | JF-143 | Open (local, not in Jira) |
| ~~AREAB-N1~~ | B — Service Provider | ~~Step-2 controls do not commit input~~ → **DEBUNKED** (datepicker needs day-cell click; wizard works E2E) | — | — | JF-564 | **Closed — not a bug (re-verified 2026-07-16)** |
| LIQBUILD-N1 | B — Service Provider / Platform | ALL /platform/api/v1/site-config/* keys → 500; blocks service-registration final submit (liquidator onboarding) | Critical | Highest | JF-564 chain; rel. JF-829 | Open (local, not in Jira) — NEW 2026-07-16 |
| AREAC-N1 | C — Estate Backbone | Real-estate AVM valuation never stored | High | High | JF-247 | Open (local, not in Jira) |
| AREAC-N2 | C — Estate Backbone | Marjea vehicle valuation returns zero vehicles | High | Medium | JF-677 | Open (local, not in Jira) |
| AREAC-N3 | C — Estate Backbone | Work-requirements validation does not reject a non-qualifying estate | High | High | JF-244 (blocks JF-245) | Open (local, not in Jira) |
| AREAE-N1 | E — Assets & Classification | Duplicate real-estate deed not prevented within same estate | High | High | JF-393 (AC15/BR4) | Open (local, not in Jira) |
| AREAE-N2 | E — Assets & Classification | Duplicate vehicle serial not prevented within same estate | High | High | JF-393 (AC16/BR5) | Open (local, not in Jira) |
| AREAE-N3 | E — Assets & Classification | Manually-added assets do not appear in assets list | High | High | JF-393 (AC17) | Open (local, not in Jira) |
| AREAE-N4 | E — Assets & Classification | No "تم إضافة أصل" audit event on asset creation | Medium | Medium | JF-393 (AC18) | Open (local, not in Jira) |
| AREAE-N5 | E — Assets & Classification | Backend accepts assets with no type / no mandatory fields | Medium | Low | JF-393 (AC3/AC11/BR8) | Open (local, not in Jira) — may be FE-enforced |
| AREAF-N1 | F — Liquidator | Inquiry recipient close (→ مغلقة) does not complete | High | Medium | JF-893 | Open (local, not in Jira) — automation caveat |
| ~~AREAF-N2~~ | F — Liquidator | ~~Liquidator cannot reach portal; auth/token 404~~ → **NOT A BUG (by design)** | — | — | JF-172/JF-363 | **Closed — Nafath registration is the normal flow (user-confirmed 2026-07-16)** |

---

## Detailed entries

### AREAA-N1 — Task deactivate returns HTTP 500
- **Area / Story:** Area A (Internal Portal Admin) / JF-152 [Reopened] Activate / deactivate task.
- **Severity / Priority:** High / High — a core admin action is completely broken by a server-side 500; flow-breaking with no workaround.
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`, API `https://d-infath-jf-api.azm-cit.com`. Logged in as admin@infath.sa (SystemAdmin) via the on-page demo-users panel.
- **Endpoint/Screen:** Task Management → task kebab menu → "إلغاء التفعيل" (deactivate). API `PUT /tasks/api/v1/task-definitions/{id}/status`.
- **Steps to reproduce:**
  1. Log in to the internal portal as a SystemAdmin.
  2. Go to Task Management (إدارة المهام) and open the kebab menu on any task.
  3. Click "إلغاء التفعيل" and confirm.
  4. Observe the response to `PUT /tasks/api/v1/task-definitions/{id}/status`.
- **Expected result:** Task transitions to deactivated (per JF-152 activate/deactivate AC).
- **Actual result:** `500 {"errorCode":"INTERNAL_ERROR","errorMessage":"حدث خطأ داخلي"}`; task stays فعالة. Reproduced on both a **draft** task (qa_auto_task_2) and a **published** task (qa_auto_task_1).
- **Evidence:** Standalone Playwright `.cjs` scripts under `test-cycle/scripts/area-a/` (specific script filename not captured in report).
- **Notes:** Reproduced across draft and published states, so not version-specific.

### AREAA-N2 — Task delete returns HTTP 500
- **Area / Story:** Area A (Internal Portal Admin) / JF-153 [Reopened] Delete task.
- **Severity / Priority:** High / High — flow-breaking server 500; soft-delete cannot be performed. (Side effect: the three seeded QA tasks could not be cleaned up.)
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`, API `https://d-infath-jf-api.azm-cit.com`; SystemAdmin session.
- **Endpoint/Screen:** Task Management → task kebab menu → "حذف" (delete) → confirm. API `DELETE /tasks/api/v1/task-definitions/{id}`.
- **Steps to reproduce:**
  1. Log in as SystemAdmin; open Task Management.
  2. Kebab menu on a task → "حذف" → confirm the dialog.
  3. Observe the `DELETE /tasks/api/v1/task-definitions/{id}` response.
- **Expected result:** Task soft-deletes (row moves to محذوفة) per JF-153.
- **Actual result:** `500 {"errorCode":"INTERNAL_ERROR"}`, toast "حدث خطأ داخلي"; the row remains فعالة (no soft-delete). Reproduced on qa_auto_task_3 and qa_auto_task_2.
- **Evidence:** `test-cycle/scripts/area-a/` (specific script filename not captured).
- **Notes:** Because delete fails, seeded tasks QA-AUTO-TASK-1/2/3 persist in CIT on purpose.

### AREAA-N3 — Roles list has no View/row action (blocks view-role-details)
- **Area / Story:** Area A (Internal Portal Admin) / JF-128 [Ready For UAT] View predefined roles.
- **Severity / Priority:** Medium / Medium — the read-only permission-matrix screen (core of JF-128) cannot be opened from the UI; feature-incomplete, no data-integrity risk.
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`; SystemAdmin session.
- **Endpoint/Screen:** Roles list `/user-management/roles`, الإجراءات (Actions) column.
- **Steps to reproduce:**
  1. Log in as SystemAdmin → User Management → Roles.
  2. Inspect the الإجراءات column for each of the 14 predefined role rows.
  3. Attempt to open a role's read-only permission matrix.
- **Expected result:** A View/عرض action per role row opens the read-only role-details / permission matrix (JF-128).
- **Actual result:** The الإجراءات column renders **no action buttons** on any role row, so the permission-matrix screen cannot be opened via the UI.
- **Evidence:** `test-cycle/scripts/area-a/` (specific script filename not captured).
- **Notes:** Related to but distinct from JF-450 (that is the Users list). The report also flags a related spec gap: role-details view for JF-128 is unreachable overall.

### AREAA-N4 — Documented PD fallback credential is stale (401)
- **Area / Story:** Area A (Internal Portal Admin), cross-cutting login. No specific JF story (test-infrastructure).
- **Severity / Priority:** Low / Medium — **not a product defect per se** (tester's own words), but the documented fallback is broken and this blocked/complicated PD-role coverage in multiple areas.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`. Credential `test2@test.com` / `Azm@123` documented in `helpers/auth.ts` as the out-of-the-box PD login.
- **Endpoint/Screen:** `POST /users/api/v1/auth/login`.
- **Steps to reproduce:**
  1. `POST /users/api/v1/auth/login` with `test2@test.com` / `Azm@123`.
  2. Observe the response.
- **Expected result:** Successful PD login (per the documented fallback in `helpers/auth.ts`).
- **Actual result:** `401 {"errorCode":"INVALID_CREDENTIALS","errorMessage":"البريد الإلكتروني أو كلمة المرور غير صحيحة"}`. (Confirmed independently by Areas B, C, D, E, F.)
- **Evidence:** `test-cycle/scripts/area-a/`; corroborated across all six area reports.
- **Notes:** Workaround = the on-page "مستخدمين تجريبيين" demo-users panel (admin@infath.sa = SystemAdmin). The demo panel has **no Purchasing (PD) role**, which is why all PD-side stories in Area B (JF-499/508/509/567/571) went NOT-TESTABLE.

### AREAA-N5 — Roles list missing spec'd "رقم الدور / Role Number" filter
- **Area / Story:** Area A (Internal Portal Admin) / JF-143 [Ready For UAT] Roles list.
- **Severity / Priority:** Low / Low — spec divergence (missing filter); no functional/data impact. Not a known Jira bug, so raised as new.
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`; SystemAdmin session.
- **Endpoint/Screen:** Roles list `/user-management/roles`; `GET /users/api/v1/roles?pageIndex&pageSize=10`.
- **Steps to reproduce:**
  1. Log in as SystemAdmin → User Management → Roles.
  2. Inspect the available filters against the JF-143 acceptance criteria.
- **Expected result:** Filters per JF-143 include a "رقم الدور / Role Number" filter (and discrete Role-Status / Name / Technical-Name filters).
- **Actual result:** Present: search box, نوع الدور, تاريخ الإنشاء. **Missing** the JF-143 "رقم الدور / Role Number" filter (and Role-Status/Name/Technical-Name as discrete filters). Verdict recorded as **FAIL (partial)**.
- **Evidence:** `test-cycle/scripts/area-a/`.
- **Notes:** Classified as a spec-gap FAIL (not FAIL-KNOWN, not marked FAIL-NEW in the source) but raised by the tester; included for completeness.

### AREAB-N1 — Service-registration step-2 guarantee date/amount controls do not commit input
- **Area / Story:** Area B (External Identity + Service-Provider Lifecycle) / JF-564 [Reopened] Service registration 6-step wizard.
- **Severity / Priority:** High / High — the entire 6-step service-registration wizard is blocked at step 2; the "التالي" (Next) button stays permanently disabled, so no service can be registered. (Downstream JF-566/JF-567/JF-571/JF-899 all become NOT-TESTABLE.)
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com` (SSO `d-infath-sso`, Nafath mock `qa-infath-mocks`). Existing SP login **1084039438** (Majed ALQAHTANI).
- **Endpoint/Screen:** `/service-providers/services` → إضافة خدمة → 6-step wizard, **step 2** (guarantee section: `lib-datepicker` issue/expiry date pickers + `lib-input-number` guarantee amount).
- **Steps to reproduce:**
  1. SP 1084039438 → select facility → الخدمات → إضافة خدمة.
  2. Step 1: check the 3 acknowledgement boxes, answer the 3 disclosure radios "لا" → التالي (enables) → step 2.
  3. Fill نوع الخدمة=مصفي, النوع الفرعي=محامي, mobile 0512345678, beneficiary, bank=Al Rajhi, IBAN `SA0380000000608010167519` (valid mod-97), email, guarantee bank=Riyad, upload both PDFs (both → 201).
  4. Type guarantee amount `50000`; type issue date `2026-07-01` and expiry `2027-06-30` into the `YYYY-MM-DD` pickers.
- **Expected result:** التالي (Next) becomes enabled and step 2 can be completed (JF-564 wizard progression).
- **Actual result:** التالي stays **permanently disabled**. `data-testid` dump shows `guarantee-issue-date`, `guarantee-expiry-date`, `guarantee-amount-input` with **empty model text and no `ng-invalid` marker**; opening the calendar yields **0 clickable day-cells**. The amount field renders `٥٠٠٠٠` (Arabic-Indic) but the control model stays empty.
- **Evidence:** `test-cycle/scripts/area-b/` scripts 03-09 (upload path proven on script 07: `POST /cases/api/v1/files/upload-chunked` → 201).
- **Notes:** Tester caveat — could be a custom-component interaction quirk vs. a product bug; **needs manual confirmation by a human clicking the calendar**. Related known issues: JF-836 (amount mask), JF-826 (date reset); the Arabic-Indic digit rendering of the amount is itself suspicious for the numeric mask.

### AREAC-N1 — Real-estate AVM valuation never stored
- **Area / Story:** Area C (Estate Backbone) / JF-247 [Reopened] AVM real-estate valuation.
- **Severity / Priority:** High / High (tester rated High) — no estimated value is persisted for any real-estate asset, so estate valuation / downstream classification is starved of RE value.
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`, API `https://d-infath-jf-api.azm-cit.com`. Login: Estate-Manager demo `demo-estate-manager@azm.sa` (EstateManager).
- **Endpoint/Screen:** `GET /cases/api/v1/assets/{assetId}`; estate header "القيمة التقديرية للتركة". (No `/valuations` endpoint — returns 404.)
- **Steps to reproduce:**
  1. Log in as EM demo → open any Area-C estate with real estate (e.g. INH00005 asset AST-2026-000061 villa; also INH00006, INH00009).
  2. `GET /cases/api/v1/assets/{assetId}` and inspect the valuation fields.
  3. Check the estate header "القيمة التقديرية للتركة".
- **Expected result:** After parcel-linking + AVM, `total_price` is stored as the asset's estimated value (JF-247).
- **Actual result:** `estimatedValue: null`, `currency:"SAR"`, `externalReference:"REGA:DEED:15348601:RE-5550006-1"`; `metadataJson` carries area/planNumber but no valuation. Estate header "القيمة التقديرية للتركة" = "-". No valuation persisted for **any** RE asset across all 5 estates. `/valuations` endpoint → 404.
- **Evidence:** `test-cycle/scripts/area-c/04-deep-dive.cjs` / `04-deep-dive.json`; seed via `02-seed-estates.cjs`.
- **Notes:** May relate to the JF-1058 chain but is AVM-specific (distinct from the Marjea vehicle path, AREAC-N2).

### AREAC-N2 — Marjea vehicle valuation returns zero vehicles
- **Area / Story:** Area C (Estate Backbone) / JF-677 [Ready For UAT] Marjea vehicle valuation.
- **Severity / Priority:** High / Medium (tester rated Medium-High) — vehicle valuation never produced; inquiry falsely reports success.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`; EM demo session.
- **Endpoint/Screen:** `GET /cases/api/v1/court-cases/{id}/marjea-inquiry`.
- **Steps to reproduce:**
  1. Use a seeded estate with vehicles (INH00007 = 2 vehicles; INH00009 = 1 vehicle).
  2. `GET /cases/api/v1/court-cases/{id}/marjea-inquiry` and inspect the response.
- **Expected result:** Marjea returns the deceased's vehicles by NID and produces valuations (JF-677).
- **Actual result:** `{status:4, succeededAt:<ts>, returnedVehicleCount:0, isReInquiryAllowed:true}` on **every** estate, including those with seeded vehicles. Inquiry reports success but returns **0 vehicles**; no vehicle valuation produced. INH00008 marjea = null.
- **Evidence:** `test-cycle/scripts/area-c/05-reinquiry-and-failpath.cjs`.
- **Notes:** Vehicle assets do exist in inventory (from the referral) but carry no Marjea value.

### AREAC-N3 — Work-requirements validation does not reject a non-qualifying estate
- **Area / Story:** Area C (Estate Backbone) / JF-244 [Reopened] work-requirements validation (blocks JF-245 rejection flow).
- **Severity / Priority:** High / High — a validation/eligibility gate is bypassed: a non-qualifying estate is neither passed nor rejected, so the JF-245 rejection notification/decision flow can never fire.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`; referral seeding via `POST /cases/api/v1/referrals` with `X-Court-Api-Key`.
- **Endpoint/Screen:** Estate events / work-requirements evaluation (event type 11 "تم استيفاء متطلبات العمل"); estate `rejectionMetaData`; سجل التركة (events) tab.
- **Steps to reproduce:**
  1. Seed referral INH00011 (`NAJIZ-AREAC-171703-06`) with `caseInfo.status="قابل للاعتراض"` (finality NOT acquired), `finalityMethod:null`, ruling method "غير محدد" (no expedited execution), and `liquidationCenter.authorities` = only "تقييم التركة" (i.e. WITHOUT "بيع وتصفية وقسمة التركة").
  2. Per JF-244 rule `صك حصر الورثة AND (قطعية ∧ صلاحية بيع OR عدم قطعية ∧ نفاذ معجل)`, this estate must FAIL work-requirements.
  3. Inspect the estate's events log and `rejectionMetaData`.
- **Expected result:** Auto-reject → status "متعذر عنها" / pending-IM-decision + rejection notification (JF-245).
- **Actual result:** Estate created with only events **1/2/3** (create + 2 manager assignments); **no work-requirements event, `rejectionMetaData: null`, status still جديد**. Validation neither passed nor rejected the estate. (Contrast: happy-path estates INH00005–00010 logged event 11 "تم استيفاء متطلبات العمل على التركة".)
- **Evidence:** `test-cycle/scripts/area-c/05-reinquiry-and-failpath.cjs`; seed estate INH00011.
- **Notes:** Tester caveat — heirs-listing for this NID (1084039438) may still be pending, but no rejection was ever emitted. This directly blocks JF-245 (no estate ever reaches a rejected state); the EM notification center also returns `400 MISSING_IDENTITY_NUMBER` for the internal EM user.

### AREAE-N1 — Duplicate real-estate deed not prevented within the same estate
- **Area / Story:** Area E (Assets & Classification) / JF-393 [Ready for QA] Add Asset (AC15 / BR4).
- **Severity / Priority:** High / High — data-integrity / validation bypass; duplicate deeds corrupt the asset inventory.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`; EM bearer token (`demo-estate-manager@azm.sa`), header `TenantIdentifier: azm-tenant-12345`.
- **Endpoint/Screen:** `POST /cases/api/v1/assets` (Assets — the EM UI Assets tab is "الأصول قريبا"/coming soon, so tested at API layer).
- **Steps to reproduce:**
  1. `POST /cases/api/v1/assets` `{courtCaseId:<INH00005>, assetType:1, deedNumber:"QA-DUP-DEED-833502", ...}` → 200.
  2. `POST` the identical `deedNumber` to the same `courtCaseId` again.
- **Expected result:** Second create is rejected/conflict (JF-393 AC15/BR4 — no duplicate RE deed within one estate).
- **Actual result:** Both requests return **200**; created AST-2026-000148 and AST-2026-000149 with the same deed in the same estate. No dup guard.
- **Evidence:** `test-cycle/scripts/area-e/` (`01..07*.cjs` + JSON). Assets AST-2026-000148/149.
- **Notes:** No existing known-issue matches (register scanned).

### AREAE-N2 — Duplicate vehicle serial not prevented within the same estate
- **Area / Story:** Area E (Assets & Classification) / JF-393 [Ready for QA] Add Asset (AC16 / BR5).
- **Severity / Priority:** High / High — data-integrity / validation bypass (duplicate vehicle serials).
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`; EM bearer token, `TenantIdentifier: azm-tenant-12345`.
- **Endpoint/Screen:** `POST /cases/api/v1/assets`.
- **Steps to reproduce:**
  1. `POST /cases/api/v1/assets` `{courtCaseId:<INH00005>, assetType:2, serialNumber:"QA-DUP-SER-833502", ...}` → 200.
  2. `POST` the identical `serialNumber` to the same estate again.
- **Expected result:** Second create rejected (JF-393 AC16/BR5).
- **Actual result:** Both return **200** (AST-2026-000151, AST-2026-000152). No dup guard.
- **Evidence:** `test-cycle/scripts/area-e/`; assets AST-2026-000151/152.
- **Notes:** No matching known issue.

### AREAE-N3 — Manually-added assets do not appear in the assets list
- **Area / Story:** Area E (Assets & Classification) / JF-393 [Ready for QA] Add Asset (AC17).
- **Severity / Priority:** High / High — assets persist but are invisible to the list endpoint the UI uses, so they would never show in the Assets tab once it ships.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`; EM bearer token, `TenantIdentifier: azm-tenant-12345`.
- **Endpoint/Screen:** `GET /cases/api/v1/assets/by-case/{id}/grouped` (and flat `/by-case/{id}`) vs `GET /cases/api/v1/assets/{assetId}`.
- **Steps to reproduce:**
  1. Create 10+ assets on INH00005 via `POST /cases/api/v1/assets` (each returns 200).
  2. `GET /cases/api/v1/assets/by-case/<INH00005>/grouped` and the flat `/by-case/<INH00005>`.
  3. `GET /cases/api/v1/assets/{assetId}` for each created asset.
- **Expected result:** Added assets appear in the by-case (grouped) list (JF-393 AC17).
- **Actual result:** Both list endpoints still return only the **16 integration-sourced assets**; **0 of the manual assets** appear, though each returns **200** on `GET /cases/api/v1/assets/{assetId}`. Not read-model lag (a probe asset created much earlier is also absent).
- **Evidence:** `test-cycle/scripts/area-e/` + JSON; 15 QA-AUTO-ASSET assets (AST-2026-000133..147) confirmed present via GET-by-id but absent from list.
- **Notes:** The Assets tab uses the grouped endpoint, so added assets would be invisible in the UI even once it ships. Other agents relying on the list view are unaffected (estates still display original integration counts).

### AREAE-N4 — No "تم إضافة أصل" audit event on asset creation
- **Area / Story:** Area E (Assets & Classification) / JF-393 [Ready for QA] Add Asset (AC18).
- **Severity / Priority:** Medium / Medium — missing audit event (per QA scale, missing audit event = Medium/Low); traceability gap, no data corruption.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`; EM bearer token.
- **Endpoint/Screen:** `GET /cases/api/v1/court-cases/{id}/events` (سجل التركة events log).
- **Steps to reproduce:**
  1. Add 10+ assets to INH00005 via `POST /cases/api/v1/assets`.
  2. `GET /cases/api/v1/court-cases/<INH00005>/events`.
- **Expected result:** An "تم إضافة أصل" (asset added) event is logged per creation (JF-393 AC18).
- **Actual result:** The events endpoint still returns **5 events**, **none** of type "asset added", after 10+ additions.
- **Evidence:** `test-cycle/scripts/area-e/` + JSON.
- **Notes:** —

### AREAE-N5 — Backend accepts assets with no type / no mandatory fields
- **Area / Story:** Area E (Assets & Classification) / JF-393 [Ready for QA] Add Asset (AC3/AC11/BR8, defensive-validation gap).
- **Severity / Priority:** Medium / Low — validation bypass, but tester flagged it **minor** and it may be FE-enforced by design.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`; EM bearer token, `TenantIdentifier: azm-tenant-12345`.
- **Endpoint/Screen:** `POST /cases/api/v1/assets`.
- **Steps to reproduce:**
  1. `POST /cases/api/v1/assets {courtCaseId, description}` (no `assetType`).
  2. `POST /cases/api/v1/assets {..., assetSource:"أخرى"}` with no source description.
- **Expected result:** Server rejects missing mandatory fields (asset type mandatory per AC3/AC11; source description required when source=أخرى per BR8).
- **Actual result:** Both return **200**; the first saves with `assetType=0` (Unknown). Only `Description` is server-enforced; asset type, source, isInsideKsa, etc. are all optional server-side.
- **Evidence:** `test-cycle/scripts/area-e/` + JSON (no-type asset + AST-2026-000154 source=أخرى test).
- **Notes:** May be FE-enforced by design — logged as a backend hardening / defensive-validation gap, not confirmed as a functional break.

### AREAF-N1 — Inquiry recipient close (→ مغلقة) does not complete
- **Area / Story:** Area F (Liquidator Lifecycle) / JF-893 [Ready for QA] close inquiry.
- **Severity / Priority:** High / Medium — the recipient-side close transition (→ مغلقة) appears broken (confirm click fires no request); mandatory-reason enforcement itself works. Priority Medium pending the automation caveat.
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`, API `https://d-infath-jf-api.azm-cit.com`. Role: assigned recipient = Relationship Manager (`demo-relationship-manager@azm.sa`).
- **Endpoint/Screen:** Inquiry detail from inbox (e.g. INQ-2026-000002) → "إغلاق الاستفسار" close panel (mandatory reason textarea "أدخل سبب إغلاق الاستفسار…").
- **Steps to reproduce:**
  1. Log in as Relationship Manager; open an assigned inquiry from the inbox (e.g. INQ-2026-000002).
  2. Click "إغلاق الاستفسار" → inline panel with mandatory reason textarea opens.
  3. Confirm with an empty reason (correctly blocked — mandatory enforced).
  4. Fill a valid reason; the "إغلاق" confirm button enables. Click it.
  5. Reload and re-check the inquiry status.
- **Expected result:** Inquiry transitions to مغلقة (recipient close), analogous to the creator path (JF-893).
- **Actual result:** Clicking the enabled "إغلاق" confirm button **fires no API request**; the inquiry stays **قيد التنفيذ** (verified by reload; 3 independent attempts — panel-scoped, role-based, keyboard-typed reason). By contrast the creator close path ("إكمال الاستفسار" → مكتملة) works and returns 200.
- **Evidence:** `test-cycle/scripts/area-f/` scripts `27`, `28`, `29`, `30`.
- **Notes:** Automation caveat — only the confirm click could not be made to submit; all other close controls behaved. Recommend manual confirmation.

### AREAF-N2 — ~~Seeded Liquidator cannot reach the portal; auth/token 404~~ → NOT A BUG (by design)
- **RESOLUTION (user-confirmed 2026-07-16):** **Not a defect.** Liquidators now log in **only through Nafath**, and first-time **registration is part of the normal onboarding flow**. A liquidator with no JF user record correctly lands on `/register` — that is the intended behavior, not an error. The `auth/token 404 USER_NOT_FOUND` simply means "not registered yet."
- **VERIFICATION (2026-07-16, `scripts/verify/liquidator-nafath-register.ts`):** re-drove the flow end-to-end. Nafath login as 1100000011 → **/register** → email + a **valid-format mobile** (0561234599) → **متابعة** → the OTP screen appears with *"تم إرسال رمز التحقق إلى رقم الجوال: +966561234599 — أدخل الرمز المكون من 4 أرقام"*. So the product **works as designed** up to OTP dispatch. (Note: the earlier fake number 0500000011 was correctly rejected as an invalid mobile — also correct behavior.)
- **FULLY RESOLVED 2026-07-16 — flow completed end-to-end.** The earlier "can't get the OTP" limitation was my error: I was reading the wrong mock host. The SMS/OTP mock is **https://d-infath-mocks.azm-cit.com** (`GET /api/notifications` → every sent SMS incl. "رمز التحقق الخاص بإنشاء حسابك هو NNNN"). Re-drove it: Nafath login `1100000011` → /register → email + valid mobile → متابعة → read the real OTP from that mock → enter it → **"تم إنشاء حسابك بنجاح"** → final متابعة → the account now logs straight into `/service-providers/companies`. So the registration + Nafath-login flow **works** and is confirmed not-a-bug.
- **What remains for a full LIQUIDATOR role (not a bug — normal flow):** per the product owner, a liquidator account is created by the SP onboarding chain — Nafath SP login → facility → **Purchaser approves the liquidator** → enter facility → **add liquidation service** → complete. That grants the liquidator role for JF login. Reaching it depends on Purchaser access + the service-registration wizard (see AREAB-N1, which is itself under review).
- **Original observation (kept for reference):** Area F (Liquidator Lifecycle). Nafath Liquidator NID 1100000011 (Majed ALQAHTANI) had no JF user record and INH00581 was absent.
- **Environment:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`, API `https://d-infath-jf-api.azm-cit.com`, SSO `d-infath-sso`, Nafath mock. Nafath Liquidator NID **1100000011** (Majed ALQAHTANI).
- **Endpoint/Screen:** `GET /users/api/v1/auth/token` (post-SSO); deep-link `court-cases/3b93081c-…` (INH00581).
- **Steps to reproduce:**
  1. Nafath mock login for 1100000011 — SSO issues an access_token; `GET /realms/Azm-JF/.../userinfo` returns `email 1100000011@azm.sa`, name "Majed ALQAHTANI".
  2. Portal calls `GET https://d-infath-jf-api.azm-cit.com/users/api/v1/auth/token`.
  3. (Fallback) app routes to `/register`; submitting fires `POST /users/api/v1/auth/request-verification` → 200 → 4-digit SMS OTP screen (unreceivable).
  4. Deep-link to INH00581 (`court-cases/3b93081c-…`) as an authenticated internal user.
- **Expected result:** The seeded liquidator authenticates into the portal and reaches the liquidator UI / accepted case INH00581.
- **Actual result:** `GET /users/api/v1/auth/token` → **404 `USER_NOT_FOUND` ("المستخدم غير موجود")**, forcing an SMS-OTP registration that cannot complete. INH00581 deep-link → **"ملف التركة غير موجود"** (estate not found) and INH00581 is absent from the estates list. No data was modified (registration never succeeded).
- **Evidence:** `test-cycle/scripts/area-f/` scripts `05`, `06`; network capture `06-register-results.json`.
- **Notes:** Specific to NID 1100000011's missing user record — other SP users (e.g. area-B's 1084039438) reach `/service-providers/companies` fine. Recommend re-seeding a liquidator user (or assigning a liquidator to a seeded estate) to unblock JF-172/363/575/840/841/842/843/888.

---

## Appendix A — Confirmed existing (known) bugs

One line each; re-confirmed this cycle (FAIL-KNOWN) — not counted in the 16.

- **JF-750** — Internal-user form has no National ID field → created users cannot Nafath-login — Area A.
- **JF-436** — Mobile field accepts letters (validated only on save) — Area A.
- **JF-417** — Task SLA field strips decimals ("2.5" → "25"); integer-only enforced badly — Area A.
- **JF-452** — Users list column set diverges from spec (extra email/phone/roles; no "رقم المستخدم") — Area A.
- **JF-451** — Users list Username column shows "—" for every user — Area A.
- **JF-450** — Users list row actions lack a View (عرض) action — Area A.
- **JF-242** — Login card title wrong ("تسجيل دخول مزود الخدمة") — Area A (cosmetic).
- **JF-248** — Login username placeholder "البريد الإلكتروني" — Area A (cosmetic).
- **JF-1059** — Create endpoints return HTTP 200 instead of 201 (app-wide Result<T>) — Areas B & F.
- **JF-862** — Applicant classification (مالك/مفوض) is self-reported, not verified against MoC responsible-person — Area B.
- **JF-829** — Step-1 disclosure instructions not rendered (`site-config` request ERR_ABORTED) — Area B.
- **JF-263** — Duplicate `technicalReferenceId` accepted (200, created INH00010) instead of 409 — Area C.
- **JF-1058** — `totalInvestments` constant 6101.84 on all estates; totals unusable for A/B ranking — Area C (and referenced by E).
- **JF-726 / JF-597** — SAMA inquiries stuck at status 5 (awaiting callback); SAMA cash/deposit data never reaches totals — Area C.
- **JF-496** — Heirs Listing ResponseCode=1 treated as failure (NID 5555555555 → status 4 `HEIRS_LISTING_RESPONSE_1`) — Area C.
- **JF-486** — Heir "حالة الوريث"/"موقف الوريث" render "-" (StatusName not bound) — Area C.
- **JF-565** — `GET /forms/api/v1/forms/match` → 403 Forbidden for role HeadEstateManager (200 for EM/RM/LegalAdvisor) — Area D (confirmed, keep open).
- **JF-757 / JF-727** — Disclosure attachment upload path blocked (silent Confirm failure / 500 on `files/upload-chunked`) — Area D (referenced; not independently reached).
- **JF-927** — Asset readiness non-deterministic status 8-vs-10, fail-open — Area E (blocker, not exercisable without callback/DB).
- **JF-735** — Readiness NULL flags treated as pass — Area E (blocker, not exercisable).
- **JF-987** — QR letter-verification Arabic-Indic digit NID; positive normalization unverifiable without real NID — Area F.

## Appendix B — Bugs that now appear FIXED (recommend verify & close)

One line each with what was observed.

- **JF-340** — Assign task to ACTIVE flow map: round-2 re-test (post-Workflows-fix) confirms `POST /forms/api/v1/forms/{id}/decision-points` on an active map with a published task now returns **200** (task version-pinned); the `400 DECISION_POINT_TASK_NOT_FOUND_OR_INACTIVE` now fires only for genuinely missing/inactive tasks — Area A / round 2 (fix verified; close after BA confirmation).
- **JF-359** — Flow map now blocks save with empty mandatory classifiers (per-field validation "التطبيق مطلوب." etc.); mandatory-classifier validation enforced — Area A (fix verified; close after BA confirmation).
- **JF-435** — Case-insensitive roles search now works (lowercase "liquidator" → 1 row); not reproduced — Area A.
- **JF-830** — `POST /cases/api/v1/files/upload-chunked` → 201 with `access-control-allow-origin: https://d-infath-jf-portal.azm-cit.com` present; CORS block not reproduced — Area B (recommend retest/close).
- **JF-495 / JF-562** — Manager auto-assignment: IM ("Demo Estate Manager") + RM ("Demo Relationship Manager") auto-assigned on every new estate with log events — Area C (verified pass).
- **JF-415** — Liquidator (المصفي) column present in estates list — Area C (verified pass).
- **JF-464** — Classification (التصنيف) column present in estates list — Area C (verified pass).
- **JF-740** — Heir dashboard SignalR CORS: dashboard loads, WS connected to `wss://d-infath-jf-ws.azm-cit.com/mainHub` (`/mainHub/negotiate` → 200); old endpoint `d-infath-a-ws` unused — Area D (fixed on registered-heir dashboard path; OTP-registration path still NOT-TESTABLE).
- **JF-741** — `POST /api/v1/auth/token` → 200 for a registered-heir session — Area D (fixed on registered-heir path; note it still 404s on the Liquidator seed path — see AREAF-N2).

> Caveat: JF-597 SAMA persistence is **NOT** verified fixed — SAMA inquiries remain stuck at status 5 with cash/deposits = 0 (see Appendix A, JF-726/JF-597).
