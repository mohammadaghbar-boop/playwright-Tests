# Liquidator (مصفي) account build — run log & outcome

**Date:** 2026-07-16  **Env:** CIT — portal `https://d-infath-jf-portal.azm-cit.com`, API `https://d-infath-jf-api.azm-cit.com`, tenant `azm-tenant-12345`
**Identity used:** NID **1100000011** (Majed ALQAHTANI) — the area-f liquidator identity.
**Scripts:** `test-cycle/scripts/liquidator-build/*.ts` (TypeScript, run via `node <file>.ts`, msedge headless). No screenshots — evidence is JSON/logs only.

---

## ⭐ FINAL OUTCOME — a usable liquidator NOW EXISTS

- **Usable liquidator:** NID **1100000011** (Majed ALQAHTANI, `majed.liq.f4@example.com`, userId `420abcd2-7f7d-4504-977f-a5d99920251e`), roles = **[ServiceProvider, Liquidator]**, with an **active facility + Approved مصفي/محامي service (ranking A)**. Log in via Nafath (SP recipe). Verified reaching liquidator surfaces: **التركات → `/service-providers/court-cases`** (estate/court-cases list renders), **الخدمات**, **التواصل والاستفسارات → `/service-providers/tickets`** — inside the entered facility.
- **How it was completed (two independent paths, both succeeded):**
  1. **Direct role grant (guaranteed):** `POST /users/api/v1/users/{userId}/roles {"roleId":"20000000-0000-0000-0000-00000000000b"}` → 200; `[ServiceProvider] → [ServiceProvider, Liquidator]`.
  2. **Natural service-registration chain:** full 6-step wizard → **confirmation dialog** → `POST /cases/api/v1/facility-services` → **200** (`facilityServiceId 0c2af1df-76ca-4955-af1c-aeb6ce194624`, PendingPurchasingReview) → PD approve `POST /cases/api/v1/facility-services/{id}/approve` → **200** → service `status: Approved, ranking: A`. (Site-config 500 was mocked at the browser to bypass the broken T&C fetch — see defect below.)
- **AREAB-N1 verdict (wizard step-2 block): NOT A PRODUCT BUG — debunked.** The whole 6-step wizard completes AND submits when driven correctly (dates via calendar day-cell click; both PDFs uploaded; confirmation dialog handled).
- **JF-946 verdict: APPEARS FIXED after the reseed.** `/service-providers/court-cases` now exists and loads the estate/court-cases list for the dual-role SP+Liquidator user (`GET /cases/api/v1/court-cases` → 200). Internal `/court-cases` still redirects (employee route), but the SP-subtree route JF-946 said was missing now works.
- **NEW defect (site-config 500):** the natural UI submit is blocked in the real env by `GET /platform/api/v1/site-config/*` → **500** for *every* key (T&C, privacy, etc.). Formal FAIL-NEW entry at the bottom. Likely same root-cause family as JF-829.
- **JF-899:** not cleanly isolable this run (Majed pre-held Liquidator via direct grant before approval); approval completed 200 and role is present.

---

## Step-by-step: what worked vs. where it blocked

| # | Step | Result | Evidence |
|---|------|--------|----------|
| 1 | Nafath login as 1100000011 | ✅ lands `/service-providers/companies` | `01-results.json` |
| 2 | Verify current roles | ✅ role = **ServiceProvider only** (no Liquidator); facilities & facility-services both **empty** (`data:[]`, totalCount 0) | `02-/03-results.json` |
| 3 | Register a facility (JF-572 manual) | ✅ **SUCCESS** | `04-results.json` |
| 4 | PD session (no PD demo user exists) | ✅ granted `PurchasingEmployee` role to `admin@infath.sa` via API | `09-/11-results.json` |
| 5 | PD approves the facility (JF-508/509) | ✅ **SUCCESS**, status → مفعل | `12-/13-results.json` |
| 6 | Enter facility + open JF-564 wizard | ✅ | `14-results.json` |
| 7 | **Wizard step 2 (AREAB-N1)** | ✅ **PASSES** — dates commit, `التالي` enables, advances to step 3 | `14-/17-results.json` |
| 8 | Wizard steps 3, 4, 5 | ✅ all pass (city, certs, licenses, coverage regions/cities) | `17-results.json` |
| 9 | Wizard step 6 + submit | ❌ **BLOCKED — server 500** on site-config terms-and-conditions | `17-/21-results.json` |
| 10 | PD approve service (JF-567) | ⛔ not reachable — no service was created | — |
| 11 | Confirm liquidator role/screens | ⛔ role never granted (blocked upstream); JF-946 would block `/court-cases` anyway | — |

---

## AREAB-N1 — VERDICT: the wizard step 2 is **NOT** genuinely broken

The prior round reported step 2 "permanently blocked — `التالي` stays disabled, calendar shows 0 clickable day-cells, guarantee amount renders Arabic-Indic but model stays empty." **This does not reproduce.** Root cause of the earlier false positive:

- The `lib-datepicker` (PrimeNG calendar) **does not commit a value when you type into the `YYYY-MM-DD` input** (the earlier scripts used `pressSequentially`/`fill` on the date input). You must **open the calendar and click a day cell** — then the value commits (`2026-07-15`, `2026-07-20` observed). The "0 day-cells" the earlier tester saw was a DOM-query miss on the *first* picker; the click-by-text fallback still committed the value.
- Once the guarantee amount is typed (`50000` accepted) **and both mandatory PDFs are uploaded**, `التالي` **enables**. In the step log the button flips `disabled:true → false` exactly after the two file uploads — i.e. the files were the last-missing mandatory input, not a broken date/amount control.

Proof: script `14-service-wizard.ts` → `VERDICT: STEP2-PASSES (Next enabled)`, `ADVANCED TO STEP 3: true`. Reproduced every subsequent run (`17`). **Recommendation: close AREAB-N1 as not-a-bug (automation interaction gap).**

Full 6-step drive confirms every step validates: step 3 (city `الرياض` via filter + postal/building/unit + 2 PDFs), step 4 (ZATCA/tax/GOSI numbers + 2 dates + 5 PDFs, tax-exemption checkbox left unchecked), step 5 (license + 2 dates + license PDF + coverage regions/cities via the custom `app-entity-searchable-dropdown` checkboxes), step 6 (years-of-experience dropdown + profile PDF + terms checkbox). The submit button became **enabled**.

---

## NEW DEFECT (FAIL-NEW) — service registration submit blocked by site-config 500

- **Screen/endpoint:** JF-564 wizard step 6 "تسجيل الخدمة" → `GET /platform/api/v1/site-config/service-registration:terms-and-conditions`.
- **Actual:** `500 {"isSuccess":false,"errorMessage":"خطأ في الخادم الداخلي","errorCode":"INTERNAL_ERROR","statusCode":500}`. On submit the page shows a "خطأ في الخادم الداخلي" toast and **no** service-creation POST fires.
- **Scope:** reproduced 3× consecutively; **every** site-config key 500s (`service-registration:privacy-notice`, `facility-registration:terms-and-conditions`, `general:terms`). So `GET /platform/api/v1/site-config/{key}` is broadly broken / unseeded in this environment. (Facility *manual* registration does not depend on it, which is why step 3 of this build succeeded.)
- **Impact:** No liquidation service can be submitted through the UI → the entire "register service → PD approve → Liquidator role" chain (JF-564/567/899) is untestable end-to-end until site-config is restored/seeded.
- **Evidence:** `17-results.json` (submitNet shows the single 500 GET, no POST), `21-results.json` (direct endpoint checks).

---

## Test data created (seeds the DB on purpose — these are test creds)

- **Facility (active):** "مؤسسة ركن الإتقان للأجهزة الكهربائية", الرقم الوطني الموحد **7041556899**, company id **`3bbe8a65-bb4a-466a-93af-e2d8fb145c1d`**, status **مفعل** (PD-approved), owner = NID 1100000011, classification مالك المنشأة. (UNNs `7100445872` / `7033961660` now return 400 on manual-verification — likely already consumed/invalid.)
- **Liquidator/SP identity:** NID **1100000011**, user `majed.liq.f4@example.com`, userId `420abcd2-7f7d-4504-977f-a5d99920251e`, phone +966561234544, roles = **[ServiceProvider]** (Liquidator NOT granted).
- **Purchasing-Department session:** `admin@infath.sa` (demo panel row **"مشرف النظام"**, no password needed), userId `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`. I **granted it the `PurchasingEmployee` role** (roleId `20000000-0000-0000-0000-00000000000c`); it now holds **[PurchasingEmployee, SystemAdmin]** and shows the "قائمة مزودي الخدمة" (/service-providers-list) menu with facility/service قبول-رفض actions. *No dedicated PD demo user exists; `test2@test.com/Azm@123` is INVALID in the reseeded env.*
- Auth states saved: `scripts/liquidator-build/.auth-liq-1100000011.json` (SP/liquidator), `.auth-pd.json` (admin+PurchasingEmployee).

## Useful endpoints discovered
- Role list: `GET /users/api/v1/roles` (PurchasingEmployee, Liquidator=`20000000-...-0000b`, ServiceProvider=`...000d`).
- Grant role: `POST /users/api/v1/users/{userId}/roles` body `{"roleId":"..."}` → 200.
- PD facility queue: `GET /cases/api/v1/companies/for-purchasing-review?pageIndex=1&pageSize=10`.
- Approve facility: `POST /cases/api/v1/companies/for-purchasing-review/{companyId}/approve` → 200.
- Facility MoC proxy `GET /cases/api/v1/companies/all` returns 400 "تعذر الاتصال بوزارة التجارة" (MoC integration flaky).
- Broken: `GET /platform/api/v1/site-config/{key}` → 500 (all keys).

## Verdict summary (using the standard classifiers) — UPDATED round 2
- JF-572 manual facility registration: **PASS**
- JF-508/509 PD facility approval: **PASS** (via PurchasingEmployee)
- JF-564 wizard steps 1–6 fillable **and submittable**: **PASS** — **AREAB-N1 = not-a-bug (close it)**; service created (POST 200)
- JF-564 final submission in the *real* env (no mock): **FAIL-NEW** (site-config `/platform/api/v1/site-config/*` → 500 blocks the T&C fetch on submit)
- JF-567 service approve: **PASS** (POST .../approve → 200, status Approved, ranking A)
- JF-899 approve → Liquidator grant: **UNVERIFIED this run** (Majed pre-held role via direct grant); recommend fresh no-role identity to confirm
- JF-946 dual-role liquidator reaches case list: **APPEARS FIXED** — `/service-providers/court-cases` renders the estates list for the SP+Liquidator user

## Round-2 test data / IDs created
- **Liquidator (final state):** NID **1100000011**, roles **[ServiceProvider, Liquidator]**, userId `420abcd2-7f7d-4504-977f-a5d99920251e`.
- **Approved liquidation service:** facilityServiceId **`0c2af1df-76ca-4955-af1c-aeb6ce194624`** on facility `3bbe8a65-bb4a-466a-93af-e2d8fb145c1d`; serviceType Liquidator, subType Lawyer, status **Approved**, ranking **A**, providerEmail liq.build@example.com, license LIC-123456, coverage region/city الرياض.
- Roles catalog: Liquidator = `20000000-0000-0000-0000-00000000000b`; PurchasingEmployee = `...0000c`; ServiceProvider = `...000d`.
- Service endpoints: create `POST /cases/api/v1/facility-services`; list `GET /cases/api/v1/facility-services?facilityId=...`; approve `POST /cases/api/v1/facility-services/{id}/approve`.

---

## DEFECT (FAIL-NEW) — site-config API returns 500 for every key; blocks all T&C/privacy content and the JF-564 service-registration submit

- **Severity/Priority:** High / High — silently blocks the final step of JF-564 service registration in the real UI (no service can be submitted without mocking), and breaks every terms-and-conditions / privacy-notice / disclosure-instructions surface that reads site-config.
- **Environment:** CIT — API `https://d-infath-jf-api.azm-cit.com`, tenant `azm-tenant-12345`. Reproduced with both the SP (Majed 1100000011) token and the admin (PurchasingEmployee+SystemAdmin) token.
- **Endpoint:** `GET /platform/api/v1/site-config/{key}`.
- **Steps to reproduce:** GET the endpoint for any key, e.g. `service-registration:terms-and-conditions`. Also reached organically by opening JF-564 wizard step 6 and clicking "تسجيل الخدمة".
- **Expected:** 200 with the configured T&C / privacy text.
- **Actual:** `500 {"isSuccess":false,"data":null,"errorMessage":"خطأ في الخادم الداخلي","errorCode":"INTERNAL_ERROR","statusCode":500,"errorDetails":null}`.
- **Scope / reproducibility:** 3× consecutive 500s; **every** key tested 500s — `service-registration:terms-and-conditions`, `service-registration:privacy-notice`, `service-registration:disclosure-instructions`, `facility-registration:terms-and-conditions`, `general:terms`. So the site-config read path (or its seed data) is globally broken/unseeded, not key-specific. Facility *manual* registration does not depend on it (which is why it succeeded).
- **Impact:** In the untouched UI, JF-564 service submission is blocked at the last step (toast "خطأ في الخادم الداخلي", no create POST fires). Only bypassed here by stubbing the response at the browser (`26-wizard-mocked-tc.ts`), after which `POST /cases/api/v1/facility-services` → 200 succeeded — proving the block is purely this 500.
- **Relationship to JF-829:** JF-829 previously reported ERR_ABORTED on the same site-config route; this is very likely the **same root-cause family**, now surfacing as a server-side 500 rather than an aborted request. Recommend linking / reopening JF-829 with this evidence.
- **Evidence:** `21-results.json` (direct GETs, 3× + multi-key), `17-results.json` (organic submit 500), `26-results.json` (mock → create 200).
