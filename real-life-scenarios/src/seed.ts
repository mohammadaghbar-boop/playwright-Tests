/**
 * Self-healing test-data seeding for the real-life journeys (CIT).
 *
 * Standalone Node script — run OPT-IN via `npm run seed` (`node src/seed.ts`, Node 24
 * type-stripping). CommonJS, so `require()` is used, not `import`. It is the ONLY thing
 * in this pack that MUTATES CIT; the journeys themselves stay strictly read-only and
 * never invoke it.
 *
 * Idempotent by design — it ensures the journeys' fixtures EXIST and creates only what
 * is missing, so re-running is safe and it does NOT flood CIT:
 *   1. Estates — if the backend already has ≥1 court-case, skip; only when there are
 *      zero does it POST a single referral (`POST /cases/api/v1/referrals`, payload/header
 *      per test-cycle/scripts/area-c/02-seed-estates.ts). CIT normally has many, so this
 *      almost always SKIPS.
 *   2. Assigned-liquidator fixture (INH00016) — VERIFIED read-only; if absent it prints a
 *      "manual step needed" note (the facility-approval + assignment chain is blocked by
 *      JF-1097 site-config 500 and needs the manual build — see test-cycle/LIQUIDATOR-BUILD.md
 *      and test-cycle/scripts/round3-liquidator/). It is NOT faked.
 *   3. Registered-heir fixture — a Nafath-seeded identity that cannot be provisioned via the
 *      API at all; prints a "manual step needed" note. Never faked.
 *
 * Prints a created/skipped/manual summary. Exits 0 even when manual steps remain (they are
 * notes, not failures); exits 1 only on an unexpected error.
 */
const path = require('path') as typeof import('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { request } = require('@playwright/test') as typeof import('@playwright/test');
import type { APIRequestContext } from '@playwright/test';

// ── config (self-contained; mirrors src/world.ts defaults, overridable via .env) ──────
const API = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT = process.env.TENANT_ID ?? 'azm-tenant-12345';
const COURT_KEY = process.env.COURT_API_KEY ?? '';
const EM_EMAIL = process.env.EM_EMAIL || 'demo-estate-manager@azm.sa';
const EM_PASSWORD = process.env.EM_PASSWORD || 'Azm@123';
const ASSIGNED_ESTATE = 'INH00016';
const HEIR_NID = process.env.HEIR_NATIONAL_ID || '1133154595';
const LIQUIDATOR_NID = process.env.LIQUIDATOR_NATIONAL_ID || '1100000011';

const RUN = String(Math.floor(Date.now() / 1000)).slice(-6);
const summary = { created: [] as string[], skipped: [] as string[], manual: [] as string[] };
const jsonHeaders = { TenantIdentifier: TENANT, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA' };
const log = (...a: unknown[]) => console.log('[seed]', ...a);

// ── a known-good single-estate referral (trimmed from area-c / round3-liquidator) ─────
function buildReferral() {
  const heirs = [
    { name: 'وارث البذرة ١', idType: 'هوية وطنية', idNumber: '1055200111', relation: 'ابن', gender: 'ذكر', sharesPerPerson: 3, totalShares: 4 },
    { name: 'وارثة البذرة ٢', idType: 'هوية وطنية', idNumber: '2022334455', relation: 'زوجة', gender: 'أنثى', sharesPerPerson: 1, totalShares: 4 },
  ];
  return {
    courtExternalCode: 'PSCT-NAJIZ-001',
    technicalReferenceId: `NAJIZ-RLS-SEED-${RUN}`,
    deedInfo: { deedNumber: `36000${RUN}`, deedDate: '1446-05-15', totalPages: 12, issuingAuthority: { country: 'السعودية', ministry: 'العدل', court: 'الرياض', department: 'الأحوال الشخصية' } },
    caseInfo: { caseNumber: `RLS-SEED-${RUN}`, caseDate: '1446-05-10', caseType: 'تصفية تركة', status: 'مكتسب القطعية', finalityMethod: 'انقضاء مدة الاعتراض', finalityStatement: 'حكم نهائي قابل للتنفيذ' },
    parties: { plaintiffs: [{ name: heirs[0].name, idType: 'هوية وطنية', idNumber: heirs[0].idNumber, nationality: 'سعودي', role: 'وارث' }], defendants: [] },
    deceased: {
      name: 'متوفى بذرة السيناريوهات', idType: 'هوية وطنية', idNumber: '1198639757', nationality: 'سعودي',
      dateOfDeathHijri: '1446-01-15', estateDocumentNumber: `EST-RLS-${RUN}`, estateDocumentDate: '1446-02-01',
      estateDocumentIssuedBy: 'محكمة الرياض', probateCertificateAttachment: `https://docs.example/probate/EST-RLS-${RUN}.pdf`,
    },
    estateAssets: {
      realEstate: [{ deedNumber: `37000${RUN}`, deedDate: '1440-10-25', plotNumber: '77/ج', location: { city: 'الرياض', district: 'العارض' }, propertyType: 'أرض خام', currentStatus: 'فعال - صك إلكتروني', inquiryDocumentNumber: `INQ-37000${RUN}`, inquiryDate: '1447-11-05', inquiryMethod: 'بوابة ناجز العقارية' }],
      vehicles: [],
      movables: [{ assetType: 'محفظة أسهم محلية', description: 'أسهم شركات سعودية', estimatedValue: 250000.0, referenceNumber: `STK-RLS-${RUN}`, custodian: 'شركة الاستثمار QA' }],
    },
    inheritanceDistribution: { legalBasis: 'المادة 180 من نظام الأحوال الشخصية', distributionRule: 'الأنصبة الشرعية المقدرة بالفرض والتعصيب', totalShares: 4, heirs },
    ruling: {
      verdictItems: [{ id: 1, title: 'الحكم بالتصفية القضائية', item: 'أولاً', description: 'إسناد تصفية أصول التركة لمركز الإسناد والتصفية (إنفاذ)' }],
      propertyDisposal: { method: 'بيع بالمزاد العلني الإلكتروني', deedNumber: `36000${RUN}`, deedDate: '1446-05-15' },
      objectionPeriod: { durationDays: 30, startFrom: 'تاريخ صدور صك الحكم النهائي', consequence: 'اكتساب القطعية' },
    },
    liquidationCenter: { name: 'مركز إنفاذ', appointmentBasis: 'قرار مجلس الوزراء', appointmentDate: '1446-03-01', feePercentage: 5.0, feeBase: 'صافي التركة', authorities: [{ id: 1, description: 'تقييم التركة' }, { id: 2, description: 'بيع وتصفية وقسمة التركة' }] },
    executiveFormula: { text: 'الصيغة التنفيذية الرسمية للحكم', issuedBy: 'محكمة الرياض', judicialDepartmentHead: 'القاضي عبدالله العتيبي' },
    metadata: { documentLanguage: 'ar', documentType: 'صك حكم تصفية نهائي', serviceType: 'ESTATE_REFERRAL', isRedacted: false, generatedAt: new Date().toISOString(), schemaVersion: '1.0' },
  };
}

// ── backend helpers (read-only except the single gated referral POST) ─────────────────
async function emLogin(ctx: APIRequestContext): Promise<string | null> {
  try {
    const res = await ctx.post(`${API}/users/api/v1/auth/login`, { headers: jsonHeaders, data: { Email: EM_EMAIL, Password: EM_PASSWORD } });
    if (!res.ok()) { log(`estate-manager API login failed: HTTP ${res.status()}`); return null; }
    const body = await res.json();
    return (body?.data?.accessToken as string) ?? null;
  } catch (err) {
    log('estate-manager API login errored:', (err as Error).message.split('\n')[0]);
    return null;
  }
}

async function fetchCourtCases(ctx: APIRequestContext, token: string, pageSize: number) {
  const res = await ctx.get(`${API}/cases/api/v1/court-cases?pageIndex=1&pageSize=${pageSize}`, {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) throw new Error(`court-cases list HTTP ${res.status()}`);
  const body = await res.json();
  const items = (body?.data?.items ?? []) as Array<Record<string, unknown>>;
  const totalCount = (body?.data?.totalCount as number) ?? items.length;
  return { items, totalCount };
}

// ── the three ensure-steps ────────────────────────────────────────────────────────────
async function ensureEstate(ctx: APIRequestContext, token: string | null): Promise<void> {
  if (!token) {
    summary.manual.push('estate: could not verify (estate-manager API login failed) — set EM_EMAIL/EM_PASSWORD in .env, then re-run.');
    return;
  }
  let count: number;
  try {
    count = (await fetchCourtCases(ctx, token, 1)).totalCount;
  } catch (err) {
    summary.manual.push(`estate: could not read court-cases (${(err as Error).message}) — verify API reachability, then re-run.`);
    return;
  }
  if (count > 0) {
    summary.skipped.push(`estate: ${count} court-case(s) already exist — nothing to create.`);
    log(`estate fixture OK — ${count} existing court-case(s), skipping creation.`);
    return;
  }
  // Zero estates → create exactly ONE (never flood).
  if (!COURT_KEY) {
    summary.manual.push('estate: NONE exist and COURT_API_KEY is not set — cannot POST a referral. Set COURT_API_KEY in .env and re-run to seed one estate.');
    log('estate fixture MISSING and no COURT_API_KEY — manual step needed.');
    return;
  }
  log('no estates found — creating one via POST /cases/api/v1/referrals ...');
  const res = await ctx.post(`${API}/cases/api/v1/referrals`, {
    headers: { ...jsonHeaders, 'X-Court-Api-Key': COURT_KEY },
    data: buildReferral(),
  });
  const bodyText = (await res.text()).slice(0, 200);
  if (res.status() < 300) {
    summary.created.push(`estate: seeded 1 referral (run ${RUN}, HTTP ${res.status()}).`);
    log(`estate created — HTTP ${res.status()} ${bodyText}`);
  } else {
    summary.manual.push(`estate: referral POST returned HTTP ${res.status()} — check COURT_API_KEY / payload. Body: ${bodyText}`);
    log(`estate creation FAILED — HTTP ${res.status()} ${bodyText}`);
  }
}

async function ensureAssignedLiquidator(ctx: APIRequestContext, token: string | null): Promise<void> {
  if (!token) {
    summary.manual.push(`assigned-liquidator (${ASSIGNED_ESTATE}): unverified — estate-manager login failed.`);
    return;
  }
  let match: Record<string, unknown> | undefined;
  try {
    const { items } = await fetchCourtCases(ctx, token, 100);
    match = items.find((i) => i.fileNumber === ASSIGNED_ESTATE);
  } catch (err) {
    summary.manual.push(`assigned-liquidator (${ASSIGNED_ESTATE}): unverified — ${(err as Error).message}.`);
    return;
  }
  const liquidatorName = match?.liquidatorName as string | null | undefined;
  if (match && liquidatorName) {
    summary.skipped.push(`assigned-liquidator: ${ASSIGNED_ESTATE} already has liquidator "${liquidatorName}" — nothing to do.`);
    log(`assigned-liquidator fixture OK — ${ASSIGNED_ESTATE} → ${liquidatorName}.`);
    return;
  }
  // Cannot be safely auto-created — the chain (facility approval + estate assignment) is
  // multi-step, needs a PurchasingEmployee actor, and is blocked by JF-1097 (site-config 500).
  summary.manual.push(
    `assigned-liquidator: ${match ? `${ASSIGNED_ESTATE} exists but has NO liquidator assigned` : `${ASSIGNED_ESTATE} not found`}. ` +
      `Auto-provisioning is unsafe (blocked by JF-1097 site-config 500 + needs PD approval and the assignment trigger). ` +
      `Run the manual build: test-cycle/LIQUIDATOR-BUILD.md + test-cycle/scripts/round3-liquidator/ (liquidator NID ${LIQUIDATOR_NID}).`,
  );
  log(`assigned-liquidator fixture NEEDS MANUAL BUILD — see LIQUIDATOR-BUILD.md.`);
}

function noteRegisteredHeir(): void {
  // A Nafath-seeded individual identity — there is no API to provision it; faking it would
  // just produce a login that Nafath rejects. So it is documented, never created.
  summary.manual.push(
    `registered-heir (NID ${HEIR_NID}): cannot be auto-provisioned — it is a Nafath-mock-seeded identity. ` +
      `If the heir journey can't log in, confirm the identity exists in the Nafath mock (qa-infath-mocks) with the QA team.`,
  );
  log(`registered-heir fixture is Nafath-seeded — manual/verification only.`);
}

// ── main ──────────────────────────────────────────────────────────────────────────────
(async () => {
  log(`starting — API ${API}, tenant ${TENANT}. Read-only except a single gated referral POST.`);
  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await emLogin(ctx);
    await ensureEstate(ctx, token);
    await ensureAssignedLiquidator(ctx, token);
    noteRegisteredHeir();
  } finally {
    await ctx.dispose();
  }

  console.log('\n──────── SEED SUMMARY ────────');
  console.log(`CREATED (${summary.created.length}):`);
  summary.created.forEach((s) => console.log('  + ' + s));
  console.log(`SKIPPED — already present (${summary.skipped.length}):`);
  summary.skipped.forEach((s) => console.log('  = ' + s));
  console.log(`MANUAL STEP NEEDED (${summary.manual.length}):`);
  summary.manual.forEach((s) => console.log('  ! ' + s));
  console.log('──────────────────────────────');
  log('done (manual notes are informational, not failures).');
})().catch((e) => {
  console.error('[seed] FATAL:', (e as Error).message);
  process.exit(1);
});
