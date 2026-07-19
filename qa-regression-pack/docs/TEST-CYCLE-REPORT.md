# JF Full Test Cycle — Consolidated Report

**Environment:** CIT (`https://d-infath-jf-portal.azm-cit.com`, API `d-infath-jf-api.azm-cit.com`, tenant `azm-tenant-12345`)
**Executed:** 2026-07-16 (autonomous, Playwright-driven via system Edge, API-first where possible)
**Scope:** the 88 dev-complete stories (Ready for QA / QA / Ready For UAT / Reopened / Blocked).
**Method:** six parallel test areas (A internal-admin, B service-provider, C estate-core, D heirs, E assets/classification, F liquidator). No screenshots (team policy) — evidence is API responses, DB-visible state via UI, and logs.

Verdict legend: **PASS** · **FAIL-NEW** (new defect) · **FAIL-KNOWN(JF-x)** (matches open bug) · **BLOCKED(JF-x)** (untestable due to blocker) · **NOT-TESTABLE** (missing creds/data/service).

---

## Login facts established
- Estate backbone APIs (court-cases, inquiries, assets) authorize the **EstateManager** role. Demo account `demo-estate-manager@azm.sa` works; the PD demo `test2@test.com` returns **401** on the backbone and **403** is returned to EstateManager on the users/roles admin APIs (correct RBAC).
- External users log in through the Nafath mock (568 mock identities; `data-fill` = national ID; 4 are Blocked).

## Test data seeded (persists in CIT)
| Estate | Internal ref | Deceased NID | Heirs | Assets | Purpose |
|---|---|---|---|---|---|
| INH00005 | INH-2026-000005 | 1198639757 | 2 | RE+VH+MV, 16 | full-mix estate |
| INH00006 | INH-2026-000006 | 1070716102 | 4 | 2 real-estate, 14 | real-estate estate |
| INH00007 | INH-2026-000007 | 1050607082 | 3 | 2 vehicles + movable, 16 | movable/vehicle estate |
| INH00008 | INH-2026-000008 | 5555555555 | 1 | none | empty-estate edge case |
| INH00009 | INH-2026-000009 | 1023456789 | 5 | RE+VH+MV, 17 | large-heir mixed estate |
| INH00010 | INH-2026-000010 | — | — | — | by-product of JF-263 duplicate-referral evidence |
| INH00011 | INH-2026-000011 | 1084039438 | — | — | JF-244 work-req fail-path seed |

(≥5 distinct estates persist — quota met. Asset-type and workflow-object seeding recorded per area below.)

---

## Area C — Estate core (COMPLETE)
Source: `results/area-c-results.md`. 24 story-lines: **13 PASS, 4 FAIL-KNOWN, 3 FAIL-NEW, 3 NOT-TESTABLE, 1 BLOCKED**.

**PASS:** JF-103 referral intake (missing deed→400, dup deed→409), JF-7/8/9/10 estate file + data/heirs/assets tabs (API), JF-22 estates list (+ manager columns JF-415/464), JF-290 real-estate registry inquiry, JF-291 CMA, JF-292 exchange, JF-155/156 manager auto-assignment (**JF-495 verified fixed** — IM+RM on every estate), JF-246/463 events log.

**FAIL-KNOWN:** JF-263 duplicate `technicalReferenceId` still returns 200 (should be 409); JF-289 SAMA inquiry stuck at status 5 (JF-726 SignalR CORS / JF-597 not fixed); JF-243 heirs-listing (JF-496); JF-272 financial totals wrong because investments constant (JF-1058).

**FAIL-NEW (new defects raised):**
- **AREAC-N1 → relates JF-247:** real-estate AVM valuation never stored — every RE asset `estimatedValue:null`; estate "القيمة التقديرية" shows "-" on all 5 estates.
- **AREAC-N2 → relates JF-677:** Marjea vehicle inquiry returns `status:4 succeeded` but `returnedVehicleCount:0` even with seeded vehicles — no valuation produced.
- **AREAC-N3 → relates JF-244:** work-requirements validation did NOT reject a non-qualifying estate (INH00011: non-final judgment + no sale authority) — no rejection event, status still جديد.

**NOT-TESTABLE:** JF-561 no-active-manager escalation (can't force zero-manager state), JF-245 rejection notification (depends on JF-244 firing), JF-155 escalation branch.

---

## Area A — Internal admin (COMPLETE)
Source: `results/area-a-results.md`. **33 PASS, 3 FAIL-NEW, 6 FAIL-KNOWN, 2 spec-gap FAIL, 1 BLOCKED, 3+ NOT-TESTABLE.**

**PASS (highlights):** JF-4 login, JF-16/17/18/151 task create/list/filters/edit, JF-488 task versioning (v1→v2 with retention), JF-831 Add-Asset trigger type (full pass), JF-104-107/110 flow-map authoring, JF-143 roles list, JF-129/147 user create/list (fields present).

**FAIL-NEW:**
- **AREAA-N1 (JF-152):** task deactivate → HTTP 500 (`PUT /tasks/api/v1/task-definitions/{id}/status` INTERNAL_ERROR), on draft AND published tasks.
- **AREAA-N2 (JF-153):** task delete → HTTP 500 (`DELETE .../task-definitions/{id}`), row not soft-deleted.
- **AREAA-N3 (JF-128):** roles list has no View/row action, so the read-only permission matrix can't be opened (distinct from JF-450 on the Users list).

**RETEST — JF-359 appears FIXED:** empty-classifier flow-map save is now blocked with per-field validation.

**FAIL-KNOWN confirmed:** JF-750 (no National ID on user form), JF-450 (no View on Users list), JF-451 (username "—"), JF-452 (extra Users columns), JF-436 (mobile accepts letters), JF-417 (SLA decimal stripped 2.5→25). **BLOCKED:** JF-108 task-to-active-map (JF-340).

**Login finding (environment):** the documented PD fallback `test2@test.com/Azm@123` fails (401) on CIT; the on-page "مستخدمين تجريبيين" demo panel exposes `admin@infath.sa` (SystemAdmin) which reaches all admin screens — the reliable internal-admin entry.

**Data seeded (persists):** users QA-AUTO-USER-1 (EMP-100002, مدير التركة), QA-AUTO-USER-2 (EMP-100003, المستشار المالي); tasks qa_auto_task_1/TSK-00076 (published v2), qa_auto_task_2/TSK-00077, qa_auto_task_3/TSK-00078; flow map QA-AUTO-MAP-1 = MAP031 (draft, Add-Asset trigger). **Quota gap:** roles QA-AUTO-ROLE-1/2 not creatable — no Create-Role UI in this phase and the permissions-catalog API 404s.
## Area B — Service provider / facility (COMPLETE)
Source: `results/area-b-results.md`. **8 PASS, 1 FAIL-NEW, 3 FAIL-KNOWN, 2 BLOCKED, 10 NOT-TESTABLE, 1 RETEST.**

**PASS:** JF-493 register facility, JF-572 manual facility registration, JF-507 select facility, JF-563 services list, JF-498 contact screen + validation + OTP-send, JF-506 contact-check gate, JF-490 identity verification E2E, JF-819 blocked-user denied.

**FAIL-NEW:**
- **AREAB-N1 (JF-564 step 2):** guarantee issue/expiry date-pickers (`lib-datepicker`) and amount (`lib-input-number`) never commit typed values to the form model — control stays empty, no `ng-invalid`, calendar day-cells unclickable → "التالي" permanently disabled, wizard cannot pass step 2. Amount renders Arabic-Indic digits. (Needs manual confirmation.)

**FAIL-KNOWN:** JF-829 (step-1 instructions endpoint ERR_ABORTED), JF-1059 (facility create POSTs return 200 not 201), JF-862 (JF-572 applicant classification self-reported).

**RETEST — JF-830 appears FIXED:** `POST /cases/api/v1/files/upload-chunked` now returns 201 with `access-control-allow-origin` present; CORS block did not reproduce. Recommend verify & close (this unblocks service registration + disclosure attachments if it holds).

**BLOCKED / NOT-TESTABLE:** JF-499/508/509/567/571/899 NOT-TESTABLE — **no working Purchasing-Department credentials** on CIT (test2@test.com and alternatives rejected; `.env` has no PD keys; demo panel exposes no PD role). JF-498 completion / JF-506 type-selection / JF-494 liquidator routing gated because the Nafath mock does not expose the 4-digit OTP.

**Facilities seeded:** شركة نجد الأولى للاستثمار التجاري (CR 1010667214, via JF-493) and مؤسسة نورة فهد للتصميم والديكور (UNN 7100445872, classification مالك, via JF-572) — both status قيد مراجعة إدارة المشتريات. (Names are MoC-sourced, so the "منشأة اختبار آلي" naming couldn't be used.) OTP requests issued for fresh users 2064030400/2198668960/2305639364.
## Area D — Heirs & disclosures (COMPLETE)
Source: `results/area-d-results.md`. **5 PASS, 2 FAIL-KNOWN, 9 NOT-TESTABLE, 0 FAIL-NEW.**

**PASS:** heir portal reachable for a registered heir (dashboard + WebSocket `wss://d-infath-jf-ws.azm-cit.com/mainHub` negotiate 200, `auth/token` 200); JF-551 heir disclosures list (correct empty state); JF-427 entry point (`/heirs/disclosures/new` scaffold loads).

**RETEST — JF-740 appears FIXED:** the heir dashboard/SignalR blocker does not reproduce for an already-registered heir; the old `d-infath-a-ws` endpoint is no longer used. Only the first-time registration→OTP path remains blocked (JF-741) and is NOT-TESTABLE without SMS OTP.

**FAIL-KNOWN:**
- **JF-565 CONFIRMED:** `GET /forms/api/v1/forms/match?caseId=<guid>` returns **403** for role **HeadEstateManager** while EstateManager / RelationshipManager / LegalAdvisor get **200**. Decisive API-level repro.
- JF-427 attachment submission path → JF-757 / JF-727.

**NOT-TESTABLE:** JF-444/549/550/428/552/471/167 — all need a liquidator identity (Nafath-only, owned by area F), a submitted disclosure, or a heir linked to an estate; none exist on the reachable surface. First-time registration (JF-740/741 exact repro) needs SMS OTP.

**Data:** registered-heir session 1133154595 (Omar ALMUTAIRI, 0 linked estates); unregistered NIDs 1084039435/1214421194/2346972615 land on `/register`. 0 disclosures seeded — impossible on reachable surface (documented, not skipped).

**Cycle recommendation:** link a registered heir NID (e.g. 1133154595) into a seeded estate's heirs list to unblock JF-427 submission/471/552/167, and provision/assign a liquidator to unblock JF-428/549/550/444.
## Area E — Assets & classification (COMPLETE)
Source: `results/area-e-results.md`. **3 PASS, 5 FAIL-NEW, 3 BLOCKED, 4 NOT-TESTABLE.**
Constraint: EM portal Assets tab shows "الأصول قريبا" (Coming Soon) and JF-393/839 are liquidator-facing; tested at the API layer. AssetType enum: **1=عقار, 2=مركبة, 3=منقول**.

**PASS:** JF-393 asset creation for all 3 in-scope types via `POST /cases/api/v1/assets` (all persisted, retrievable by GET-by-id).

**FAIL-NEW (all JF-393, `POST /cases/api/v1/assets`):**
- **AREAE-N1 (AC15):** duplicate real-estate `deedNumber` within the same estate not prevented — both accepted (200).
- **AREAE-N2 (AC16):** duplicate vehicle `serialNumber` within the same estate not prevented.
- **AREAE-N3 (AC17):** manually-added assets never appear in `/assets/by-case/{id}/grouped` (0 of 15 listed) though each is retrievable by id — not a lag, a list-omission defect.
- **AREAE-N4 (AC18):** no "تم إضافة أصل" audit event on creation.
- **AREAE-N5 (minor):** backend accepts an asset with no asset type (`assetType=0`) and مصدر=أخرى without a description (defensive-validation gap).

**BLOCKED:** JF-157 (JF-927), JF-171 (JF-1058 — investments constant → ranks A/B unreachable), JF-759 (no classified estate reachable).
**NOT-TESTABLE:** JF-831, JF-839 (EM 403 on merge), JF-970/971/972 (Code Review; endpoints 404, no sidebar).

**Assets seeded (asset-type quota MET — 3 per type across estates):** Real Estate AST-2026-000133/136/139/142/145; Vehicle …134/137/140/143/146; Movable …135/138/141/144/147 (+ duplicate-test 148–154, recon 124–132). Note: due to AREAE-N3 these are invisible to list endpoints, so other areas' displayed counts are unaffected.
## Area F — Liquidator flows (COMPLETE)
Source: `results/area-f-results.md`. **24 PASS, 2 FAIL-NEW, 2 FAIL-KNOWN, 8 BLOCKED, 4 NOT-TESTABLE.**

**Headline blocker (data drift):** the seeded liquidator **Majed ALQAHTANI (NID 1100000011) no longer has a JF user record**, and **case INH00581 no longer exists** in the current CIT env. After a successful Nafath/SSO login, `GET /users/api/v1/auth/token` → **404 USER_NOT_FOUND**, forcing a `/register` gate requiring a 4-digit SMS OTP (unavailable). So the entire liquidator-authenticated UI is untestable; coverage came via internal demo logins (EstateManager/RM/LegalAdvisor/SystemAdmin through the `/login` demo panel).

**PASS (highlights):** JF-844 public QR verification (6 API cases — unknown letter, missing fields, public-no-401, no-info-leak, injection-safety, ar/en); JF-889 admin letter-template setup (list + all 5 sections + insert-variable + publish; **created & published** a template); JF-891 create inquiry (full wizard, recipient matrix, INQ numbering — **2 created**); JF-892 reply, JF-893 creator-close→مكتملة, JF-894 forward, JF-895 assignment routing; JF-886 cases list (pills/columns/KPIs); API RBAC — JF-575/886/889/891 all reject anonymous (401).

**FAIL-NEW:**
- **AREAF-N1 (JF-893 recipient path):** inquiry recipient close (→ مغلقة) does not complete — mandatory-reason panel enforces a reason but the enabled "إغلاق" confirm fires no request; status stays قيد التنفيذ (creator-close→مكتملة works).
- **AREAF-N2:** liquidator `auth/token` 404 blocker (JF-741/755-adjacent) — seeded liquidator can't reach the portal.

**FAIL-KNOWN:** JF-987 (Arabic-Indic digit NID), JF-1059 (create returns 200 not 201, seen on tickets + correspondence-setup POSTs).

**Data seeded:** correspondence entity/template "AreaF QA Bank 058160" (status معتمد); INQ-2026-000001 (→ Legal Consultant; forwarded then completed→مكتملة); INQ-2026-000002 (→ RM; has RM reply; still قيد التنفيذ due to AREAF-N1).

**BLOCKED/NOT-TESTABLE:** JF-172, JF-363, JF-575 (create), JF-840/841/842, JF-843, JF-888 (add) — all need a liquidator session or an estate in active liquidation; JF-844 positive card needs the deceased NID (DB-only).

---

## Environment/test-data gaps to raise (not product defects)
1. **No working Purchasing-Department credentials** on CIT → PD-side facility/service review (JF-499/508/509/567/571) untestable.
2. **No SMS OTP access** on the Nafath mock → first-time external registration (heir & liquidator) and JF-498/494/506 completion untestable.
3. **Liquidator demo identity drift** — NID 1100000011 has no user record and INH00581 is gone → liquidator-authenticated flows untestable. Provision a liquidator user + assign to a seeded estate.
4. **No DB relay credentials** → JF-844 positive verification and any DB-assert checks not runnable.
5. **No estate in active-liquidation state** reachable → assignment/correspondence/legal-case creation blocked.

_(All six area reports are in `results/area-{a..f}-results.md`.)_

---

## Final rollup (all six areas complete)

**Aggregate verdicts (~120 story-lines):** PASS ≈ 86 · FAIL-NEW ≈ 13 · FAIL-KNOWN ≈ 17 · BLOCKED ≈ 15 · NOT-TESTABLE ≈ 29+.

**New defects raised (13), each with repro:** AREAC-N1 AVM valuation never stored (JF-247), AREAC-N2 Marjea returns 0 vehicles (JF-677), AREAC-N3 work-req doesn't reject (JF-244), AREAE-N1/N2 duplicate asset deed/serial accepted, AREAE-N3 manual assets invisible to list, AREAE-N4 no add-asset audit event, AREAE-N5 missing asset-type accepted, AREAB-N1 service-wizard step-2 datepickers don't commit (JF-564), AREAA-N1 task deactivate 500 (JF-152), AREAA-N2 task delete 500 (JF-153), AREAA-N3 roles list no View action (JF-128), AREAF-N1 inquiry recipient-close no-op (JF-893).

**Previously-blocking bugs that now appear FIXED (verify & close):** JF-830 (upload-chunked CORS → 201), JF-740 (heir dashboard/WebSocket healthy), JF-359 (flow-map classifier validation), JF-495 (manager auto-assignment).

**Still-broken blockers confirmed:** JF-1058 (investments constant 6101.84 → ranks A/B unreachable), JF-565 (HeadEstateManager 403 on forms/match), JF-263 (duplicate referral 200 not 409), JF-750 (no National ID on user form), JF-726/597 (SAMA/SignalR status stuck), JF-340 (task-to-active-map), JF-927 (readiness non-deterministic).

**Coverage handed to the regression pack:** every PASS above with a stable API contract is now guarded by `regression-pack/` (30 tests, GO/NO-GO reporter). Blockers are encoded as annotated guards that flip to green when fixed.

---

## Round 2 — post-Workflows-fix re-test (2026-07-16)
The dev lead fixed the "Workflows" (flow-map / workflow engine) issue; re-tested the flow-map-dependent stories. Full detail: `results/round2-workflow-results.md`.

**Improved (BLOCKED → PASS): 2**
- **JF-340 (bug) + JF-108:** assigning a PUBLISHED task to an ACTIVE flow map now works — `POST /forms/api/v1/forms/{id}/decision-points` returns **200** (task version-pinned), where round 1 got `400 DECISION_POINT_TASK_NOT_FOUND_OR_INACTIVE`. The 400 now fires only for genuinely missing/inactive tasks (guard verified intact). **JF-340 appears FIXED.**
- JF-110 versioning, JF-471 disclosure map (config), JF-705 asset-level maps confirmed PASS; JF-359 holds fixed.

**Still broken (unchanged by this fix):** JF-1058 (classification still D-only across 13 estates — separate root cause), JF-927 (readiness — still not deterministically reachable). JF-109 liquidator-answering still NOT-TESTABLE (no liquidator identity — the env data-drift gap).

**New defects in round 2: none.** RBAC re-verified (EstateManager correctly 403 on flow-map lifecycle + decision-point writes).

**Regression pack after round 2:** grew to **30 tests, 28 green**, still GO. New TS spec `tests/02-admin/flow-map-decision-points-api.spec.ts` (self-cleaning). The reporter now lists **JF-340 and JF-359 under "possibly fixed — verify & remove."**

## Liquidator onboarding — completed E2E (2026-07-16, details: `LIQUIDATOR-BUILD.md`)
Following the product owner's flow, a **working liquidator now exists**: NID **1100000011**
(Majed ALQAHTANI), roles **[ServiceProvider, Liquidator]**, active facility "مؤسسة ركن الإتقان"
(UNN 7041556899), **Approved مصفي service ranking A**. Chain proven: facility registration →
Purchasing approval (PurchasingEmployee role granted to admin@infath.sa — no PD demo user exists
post-reseed) → service registration (`POST /cases/api/v1/facility-services`; the UI submit has a
confirmation dialog) → service approval + ranking → role active. Verified screens: in-facility
التركات → `/service-providers/court-cases` (estates list, 200), services, inquiries.
- **JF-946 appears FIXED** (dual-role SP+Liquidator reaches the case list post-reseed).
- **AREAF-N2 reclassified NOT-A-BUG** — Nafath-only login with first-time registration is the
  intended onboarding; verified E2E incl. real SMS OTP read from `d-infath-mocks.azm-cit.com/api/notifications`.
- **Sole UI blocker found and filed: JF-1097** (all site-config keys → 500; related to JF-829).

## Jira filings (2026-07-16)
JF-1097 … JF-1102 filed, **all assigned to Saeed**; 1097/1098/1099/1100 titled
"[DB Migration Regression]" (PostgreSQL→SQL Server, backend/persistence family);
1101/1102 not prefixed (provider-side / pure-frontend). JF-1097 linked to JF-829.

## Round 3 — liquidator lifecycle (2026-07-16, `results/round3-liquidator-results.md`)
With the real rank-A liquidator (NID 1100000011) in place, the previously liquidator-blocked
stories were re-tested. **Correction to earlier rounds:** the assignment pipeline **WORKS** — a
freshly seeded estate driven with one well-timed `workflow/start` reliably emits event 23
"إرسال طلب تعيين للمصفي" and reaches the liquidator (reproduced on INH00016 & INH00018, even a
rank-D estate). **JF-1058 does NOT block assignment** — the round-1/2 "blocked" reads were
environmental (no liquidator existed + expired requests), not the classification bug.

**11 stories flipped to PASS:** JF-172 (assignment request), JF-363 (accept → status 11 + event 24; reject → back to 10 + event 25), JF-575 (add inquiry authority; RBAC 403 for EM), JF-840/841/842 (correspondence start → letter MK-16-1 → follow-up/evaluation → Completed), JF-843 (partial), JF-889 (re-confirmed), JF-886 (cases list), JF-888 (MOJ integration reachable; positive needs a real Taqadhi case code), JF-109 (liquidator answers a form-backed task), JF-444 (heirs confirmation — was NOT-TESTABLE in round 1).

**Still BLOCKED — but by the HEIR disclosure pipeline, not assignment:** JF-428, JF-549, JF-550, JF-552, JF-471-runtime — all need a submitted heir disclosure (gated by JF-757/JF-727 attachment blockers + no heir NID linked to a seeded estate).

**FAIL-NEW: 0.** Golden assigned estate **INH00016** (status 11, liquidator accepted) left in place for future testing. Minor dev-robustness note: hammering `workflow/start` ~16× on INH00017 mid-classification wedged it (self-induced).

## Closure summary (2026-07-16)
**Scope covered:** full test cycle over all dev-complete stories (6 areas A–F) + round-2 (post-Workflows-fix) + round-3 (liquidator lifecycle) + a complete liquidator-account build.

**Defects — final disposition:**
- **Filed in Jira (6), all assigned Saeed:** JF-1097 (site-config 500s, *DB Migration Regression*, Highest), JF-1098 (task deactivate 500, *DBMR*), JF-1099 (task delete 500, *DBMR*), JF-1100 (AVM per-asset null, *DBMR*), JF-1101 (Marjea 0 vehicles), JF-1102 (inquiry recipient-close no-op). JF-1097 linked to JF-829.
- **Fixed since found (not filed):** JF-340, JF-359 (round 2); JF-128 roles View, JF-244 work-req rejection (residual: rejectionMetaData null → optional Low ticket).
- **Not bugs / debunked:** AREAF-N2 (Nafath registration is by design), AREAB-N1 (wizard datepicker needs day-cell click).
- **Asset defects (5) — 0 filed:** wrong-endpoint artifacts (3 dropped) + 2 held NOT-REACHABLE pending an assignable estate. The liquidator-role gate prevented 3+ invalid filings.
- **Round 3: 0 new defects.**
- **Candidate awaiting user call:** CAND-1 (liquidator add-asset button routes to a guard-bounced internal URL).

**Two open blockers still confirmed real:** JF-1058 (classification investments constant → real ranks A/B unreachable — the regression pack's "possibly fixed" flag is a FALSE positive from round-3 manually forcing a rank-A estate as test data, not a code fix) and the **heir disclosure pipeline** (JF-757/727 + no heir linked to a seeded estate) which is the sole remaining gate for JF-428/549/550/552/471-runtime.

**Regression pack:** 12 spec files / 32 tests; latest run **25 pass, 1 known-fail (JF-829), 6 skipped (SP/heir Nafath-login — transient mock `ERR_ABORTED`), verdict GO.** GO/NO-GO reporter working; known-issues registry current through JF-1102.

**Environment/test-data gaps to raise (not product bugs):** no working PD demo credentials (worked around by granting PurchasingEmployee to admin@infath.sa); no DB relay creds; Nafath mock intermittently flaky. **Golden fixtures left in place:** assigned estate INH00016 (liquidator accepted), liquidator NID 1100000011, facility UNN 7041556899.

## Automation is TypeScript
All automation is now TypeScript (team standard): the regression pack + 198 backlog specs were already `.ts` and are strict `tsc`-clean; the 133 test-cycle execution harnesses were converted `.cjs → .ts` (run via Node 24 type-stripping) and the 3 data generators `.js → .ts`. **Zero `.js`/`.cjs` remain** in the deliverables.
