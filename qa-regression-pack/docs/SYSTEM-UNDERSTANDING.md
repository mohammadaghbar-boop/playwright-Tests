# Infath Joint Funds (JF) — Full System Understanding

Generated 2026-07-16 from **all 437 Jira issues** (190 stories, 7 tasks, 240 bugs) in the JF
project on saudiazmco.atlassian.net. Detailed per-batch analyses live in `analysis/`
(batch-1/2/3-analysis.md + bugs-known-issues.md); every issue's full text is in `issues/`.

---

## 1. What the system is

A government platform (Infath) for **liquidating joint funds / inheritance estates** in
Saudi Arabia. It receives inheritance cases referred from the courts (Najiz/MOJ), builds an
**estate file** for the deceased, discovers and values all assets, confirms heirs, classifies
the estate's difficulty, assigns a licensed **liquidator** (from registered service-provider
facilities), and drives the liquidation through tasks, disclosures, correspondence, legal
cases, and financial settlement via ERP — until funds are distributed.

**Environments (CIT/Dev):**
- Portal: `https://d-infath-jf-portal.azm-cit.com`
- SSO (Keycloak): `https://d-infath-sso.azm-cit.com`
- Nafath / external-service mocks: `https://qa-infath-mocks.azm-dev.com` ("AZM Mock Control Center")
- DB relay (CloudBeaver → restricted Postgres): `https://d-infath-db.azm-cit.com`
- Credentials: repo `.env` (gitignored) — see `.env.example` for the variable names.

## 2. Actors / roles

| Actor | How they enter | Notes |
|---|---|---|
| Internal users (Estate Manager, Relationship Manager, Inheritance Manager, Head/Chief Estate Manager, Legal Consultant/Advisor, Financial Consultant, Purchasing Dept, Super Admin) | `/login` email+password (Keycloak) | Created via User Management (EXT users get SMS activation); 6 predefined roles, element-level permissions |
| Service Provider (facility owner / مزود الخدمة) | `/nafath-login` → SP → Nafath mock | Registers facility (MoC-verified) and services; مصفي service approval grants **Liquidator** role |
| Liquidator (مصفي) | Nafath | Ranked أ/ب/ج/د; auto-assigned to estates by rank+workload; works tasks, disclosures, legal cases |
| Heir (وريث) | Heir portal via Nafath + OTP | Admission (confirm/reject estate), disclosures, dashboard |
| Public | QR letter-verification page | Verifies correspondence letters (letter no. + deceased NID) — no auth |

Demo access: Nafath mock exposes a "Mock Users" panel (national IDs via `data-fill` buttons);
known identities include Majed ALQAHTANI (1100000011 — dual SP+Liquidator, case INH00581),
Mohammed ALGHAMDI (SP), Sarah ALQAHTANI (1115789890 — blocked-user case), deceased NIDs
1070716102 / 5555555555 / 1050607082, golden classification NIDs 1000000099 / 1023456789.
PD demo login `test2@test.com` (fallback in `helpers/auth.ts`).

## 3. End-to-end estate lifecycle (the backbone)

1. **Referral intake (Najiz/MOJ)** — court sends case with judgment deed number; duplicates
   rejected (known defect JF-263: duplicate `technicalReferenceId` returns 200 not 409).
   Receipt statuses: ناجح / ناجح جزئي / فشل الاستلام.
2. **Estate file creation** — unique immutable estate number (TRK-/INH00xxx series), name
   auto-set to "تركة [المورث]"; tabs: data, heirs, assets, cases, finance, correspondences,
   inquiry entities, events log.
3. **Judgment deed analysis** — auto PDF extraction (~90 fields, ≥5 fields = success,
   retries 1/5/15 min); **deed-analysis review** by Legal Consultant (JF-747/824, Blocked)
   gates downstream.
4. **Inquiry fan-out at file initiation** (auto, internal statuses, manual re-inquiry only
   by Estate/Relationship Manager):
   - Heirs Listing (inhaatdeeds API by deceased socialId)
   - SAMA/Central Bank financial inquiry (5 endpoints + webhook)
   - Real Estate Registry (titlesByID, paginated)
   - CMA investments (NafithNumber + webhook)
   - Paseetah AVM real-estate valuation (parcel_gid)
   - Marjea vehicle valuation (by deceased NID)
5. **Financial totals** — Total = Cash + Deposits + Investments; Net = Total − Liabilities
   (CB + CMA sources only, dedup by IBAN, SAR, 2 decimals).
6. **Work-requirements validation** — rule: صك حصر الورثة AND (قطعية ∧ صلاحية بيع OR
   عدم قطعية ∧ نفاذ معجل); fail → auto-reject (متعذر عنها) unless Inheritance Manager
   overrides with reason (≤600 chars).
7. **Auto manager assignment** — Inheritance Manager + Relationship Manager by lowest active
   caseload (random tie-break); no active manager → escalation (JF-561 blocker: missing).
8. **Heirs admission** — each heir confirms/rejects via heir portal (48h/heir timeout);
   confirm → جاهز مبدئيًا; reject → disclosure → غير جاهز → classification.
9. **Asset readiness classification** — 6 criteria (raw-land only, isRealEstate flags,
   updated deed…) → جاهز / غير جاهز / مقيد (JF-927 blocker: non-deterministic, fail-open).
10. **Inheritance (estate) classification** — Not-Ready assets only; 6 weighted criteria
    (weights sum to 100%, 5-level bands 0/25/50/75/100) → score /100 → rank
    **A 76–100 / B 56–75 / C 31–55 / D 0–30** (JF-1058 blocker: estimatedValueImpact stuck
    ≈6101.84 so A/B unreachable). Manual override by manager clears score, may trigger
    liquidator reassignment.
11. **Liquidator assignment** — rank match (same → higher, never lower) + lowest workload
    incl. pending requests; auto-generated Authorization Letter PDF (1-year validity,
    retry immediate/1m/5m — letter failure gates assignment); estate → قيد تعيين المصفي;
    accept → قيد العمل; reject/48h expiry → reassign with exclusion. Sensitive data
    (IBANs, NIDs, contacts) hidden until acceptance.
12. **Liquidation work** — flow-map-driven tasks (triggers: stage, add-asset per type,
    liquidator reassignment), disclosures (dynamic questionnaires matched on 8 attributes;
    مفصح consent via نبأ SMS + Nafath, 72h auto-reject), external-entity correspondence
    (templated letters, SLA + 3 reminders → escalate, QR public verification), legal
    consultations/reviews (LQ-YYYY-NNN), legal cases via MOJ Taqadhi
    (GetCaseInfoByCaseCode), communications/inquiries (INQ-YYYY-NNN, recipient matrix).
13. **Financial settlement (ERP)** — SendInheritanceToERP → CreateCaseVirtualAccount
    (company always 3); heirs bank inquiry; balanced journals (debit=credit, SAR);
    posting/reverse sync — ERP is the journal store.
14. **Asset liquidation platform** — Ready assets + estate IBAN sent out; 9 event types back;
    return-to-readiness API; merge groups held until all members مهيأ (same-auction flag).

## 4. Supporting/admin subsystems

- **User Management** — users (auto usernames, SMS activation, soft delete, liquidator rank
  أ–د), roles (element-permission cascade, immediate propagation), external users
  (EXT-####, 72h single-use activation).
- **Field/Form builder + Tasks engine** — 11 field types, actions library, drag-and-drop
  templates with AND/OR rules engine; tasks 1–7 fields, SLA, approval dependency;
  non-retroactive edits; automatic flow-map versioning (v1/v2 pins in-flight cases).
- **Control panel** — togglable readiness criteria; classification weights must total 100%;
  rank thresholds configurable.
- **Dashboards** — 7 role dashboards (Chief EM has Top/Bottom-10 performance).
- **Notification platform (Azm, multi-tenant)** — SMS/Email channels (ZeptoMail/SMTP),
  immutable template codes, typed variables, runtime /send. Retries 1/5/15 min ×3.
- **Estate events log** — immutable audit tab, 15/page, prev/new status per event.

## 5. External integrations (and their mocks)

Najiz/MOJ (referrals, Taqadhi case info) · inhaatdeeds Heirs Listing · SAMA/Central Bank ·
Real Estate Registry · CMA · Paseetah AVM · Marjea/Elm vehicle valuation (app-id/app-key
headers — never log) · Ministry of Commerce (facility verification) · ERP (4 services) ·
Asset Liquidation Platform · نبأ SMS · Nafath (identity) · ZeptoMail/SMTP · Court/SAMA/CMA
callback APIs (keys in `.env`). All mocked in CIT via the AZM Mock Control Center.

## 6. Cross-cutting conventions (test oracles)

- Retry cadences: notifications & inquiries 1/5/15 min ×3; integration fallback 3×30s
  (then manual-entry task + "Manually Entered" flag); ERP send 5m/15m (never on business
  errors); authorization letter immediate/1m/5m.
- Failures never roll back saved business decisions — **except** JF-897 (failed نبأ SMS
  rolls back the disclosure).
- One shared generic Arabic error message; no technical statuses on the UI.
- No partial records; soft delete = irreversible "Deleted" status; full audit log (fixed
  5-column format) everywhere.
- Lists 10/page; dashboard tables 5 rows + "الكل"; dual Hijri/Gregorian dates;
  verify-then-unlock forms with locked gray fields and source badges.
- Two 48-hour windows (heir admission, liquidator response); 72h windows (activation links,
  مفصح consent).

## 7. Current state (2026-07-16) & test scope

Dev-complete pipeline ("Ready for QA" and beyond): **15 Ready for QA + 4 QA + 19 Ready For
UAT + 47 Reopened + 3 Blocked stories** (+ bug pipeline: 25 Ready for QA, 29+2 UAT-pending).
Backlog/To Do/In Progress/Code Review (102 stories) are NOT dev-complete.

**19 active blockers** (see `analysis/bugs-known-issues.md`) currently make these flows
untestable E2E: service registration (JF-830/828), disclosures with attachments
(JF-757/727), attachment preview/download (JF-832/852), heir portal registration→dashboard
(JF-741/740), new-internal-user login (JF-750), Head-EM heirs confirmation (JF-565),
real-time inquiry status (JF-726 SignalR CORS), real-estate asset details (JF-305),
flowchart authoring with classifiers (JF-359/340/352), classification ranks A/B
(JF-1058/927), assignment-failure escalation (JF-561).

**Spec-quality risks:** JF-297/298/299 leave portal-wide behaviors undefined; JF-506 and
JF-268 contain contradictory ACs; JF-747 AC010 role contradiction; JF-707/734 ERP contract
conflicts; JF-1066 empty.

## 8. Feature → dependency map (condensed)

```
Referral(Najiz) ──> Estate file ──> Deed analysis ──> Deed review(BLOCKED) ─┐
                        │                                                   │
                        ├─> Inquiries: Heirs/SAMA/REGA/CMA/AVM/Marjea ──> Financial totals
                        │                                                   │
                        ├─> Work-req validation ─> auto-reject / override   │
                        ├─> Manager auto-assignment                         │
                        └─> Heirs admission ─┬─ confirm → جاهز مبدئيًا ──────┤
                                             └─ reject → disclosure → غير جاهز
                                                                            │
Asset readiness (6 criteria) ─> Ready assets ─> Liquidation platform / auctions
        └─> Not-Ready ─> Estate classification (A–D) ─> Liquidator assignment
                                                            │ (rank+workload+authz letter)
SP registration ─> Facility (MoC) ─> Services (PD approve, rank أ–د) ─> Liquidator pool
Liquidator work: tasks(flow maps) + disclosures + correspondence + legal + ERP journals
ERP: SendInheritance → VirtualAccount → journals → posting/reverse
Admin: users/roles → permissions gate every list & action (API-level RBAC)
Control panel: criteria toggles + weights ──> readiness & classification behavior
Notifications (Azm platform) underlie every status transition above
```
