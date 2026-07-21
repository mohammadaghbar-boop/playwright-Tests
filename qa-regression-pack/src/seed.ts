/**
 * Self-healing test-data seeding for the regression pack (CIT).
 *
 * Standalone Node script — run OPT-IN via `npm run seed` (`node src/seed.ts`, Node 24
 * type-stripping). CommonJS, so `require()` is used, not `import`. It is the ONLY thing
 * in this pack that MUTATES CIT; the regression specs themselves stay strictly read-only
 * and never invoke it (nothing in the `npx playwright test` flow calls this file).
 *
 * It reuses the pack's identities from `src/helpers/users.ts` (EstateManager login, URLs,
 * tenant) and mirrors the endpoint paths declared in `src/helpers/api.ts`. It cannot
 * `require()` api.ts directly (that module uses extensionless ESM relative imports which
 * Node's runtime loader rejects), so — exactly like the real-life pack's seeder — the tiny
 * login/GET/POST layer is inlined here.
 *
 * Idempotent by design — it ensures the pack's fixtures EXIST and creates only what is
 * missing, so re-running is safe and it does NOT flood CIT:
 *   1. ensureEstates(n) — GET /cases/api/v1/court-cases first; if the backend already has
 *      >= n court-cases, SKIP. Only the shortfall is topped up (capped at CREATE_CAP) via
 *      `POST /cases/api/v1/referrals` with the `X-Court-Api-Key` header (payload/header per
 *      test-cycle/scripts/area-c/02-seed-estates.ts). CIT normally has many, so this SKIPS.
 *   2. ensureAssets(caseId, perType) — GET the case's assets first; only categories under
 *      `perType` are topped up via `POST /cases/api/v1/assets/for-case/{caseId}` (payload
 *      per test-cycle/scripts/liquidator-asset-retest/18 + area-e). This endpoint is
 *      ASSIGNED-LIQUIDATOR gated (errorCode FORBIDDEN_NOT_ASSIGNED_LIQUIDATOR, verified on
 *      CIT): the EstateManager actor is not the assigned liquidator, and liquidator
 *      assignment is itself blocked by JF-1097 (site-config 500). So when the POST is
 *      rejected the seeder records a "manual step needed" note and STOPS (never floods).
 *
 * Guarded dry run: set `SEED_DRY_RUN=1` (or pass `--dry`) to do the read-only counts and
 * print exactly what WOULD be created without issuing a single mutating POST.
 *
 * Prints a created/skipped/manual summary. Exits 0 even when manual steps remain (they are
 * notes, not failures); exits 1 only on an unexpected error.
 */
const path = require('path') as typeof import('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { request } = require('@playwright/test') as typeof import('@playwright/test');
import type { APIRequestContext } from '@playwright/test';

// Reuse the pack's shared identities (users.ts has no relative imports, so require() works).
const { URLS, TENANT_ID, INTERNAL_USERS } =
  require('./helpers/users.ts') as typeof import('./helpers/users');

// ── config (overridable via .env / env) ───────────────────────────────────────────────
const API = URLS.api;
const TENANT = TENANT_ID;
const COURT_KEY = process.env.COURT_API_KEY ?? '';
const EM = INTERNAL_USERS.estateManager;
const ESTATE_TARGET = Number(process.env.SEED_ESTATE_COUNT ?? 5);
const ASSETS_PER_TYPE = Number(process.env.SEED_ASSETS_PER_TYPE ?? 1);
const ASSET_CASE_ID = process.env.SEED_CASE_ID ?? ''; // else: first court-case in the list
const CREATE_CAP = Number(process.env.SEED_CREATE_CAP ?? 5); // hard ceiling — never flood CIT
const DRY = process.env.SEED_DRY_RUN === '1' || process.argv.includes('--dry');

const RUN = String(Math.floor(Date.now() / 1000)).slice(-6);
const summary = { created: [] as string[], skipped: [] as string[], manual: [] as string[] };
const jsonHeaders = { TenantIdentifier: TENANT, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA' };
const log = (...a: unknown[]) => console.log('[seed]', ...a);

// asset-category ids used by POST /assets/for-case (verified against the live payloads):
//   1 = عقار (real-estate)   2 = منقول (movable)   3 = مركبة (vehicle)
const CATEGORIES: Array<{ id: number; label: string }> = [
  { id: 1, label: 'real-estate' },
  { id: 2, label: 'movable' },
  { id: 3, label: 'vehicle' },
];

// ── a known-good single-estate referral (trimmed from area-c/02-seed-estates.ts) ──────
function buildReferral(idx: number) {
  const tag = String(idx).padStart(2, '0');
  const deedNumber = `${RUN}${tag}`;
  const heirs = [
    { name: 'وارث بذرة الانحدار ١', idType: 'هوية وطنية', idNumber: '1055200111', relation: 'ابن', gender: 'ذكر', sharesPerPerson: 3, totalShares: 4 },
    { name: 'وارثة بذرة الانحدار ٢', idType: 'هوية وطنية', idNumber: '2022334455', relation: 'زوجة', gender: 'أنثى', sharesPerPerson: 1, totalShares: 4 },
  ];
  return {
    courtExternalCode: 'PSCT-NAJIZ-001',
    technicalReferenceId: `NAJIZ-REG-SEED-${RUN}-${tag}`,
    deedInfo: { deedNumber, deedDate: '1446-05-15', totalPages: 12, issuingAuthority: { country: 'السعودية', ministry: 'العدل', court: 'الرياض', department: 'الأحوال الشخصية' } },
    caseInfo: { caseNumber: `REG-SEED-${RUN}-${tag}`, caseDate: '1446-05-10', caseType: 'تصفية تركة', status: 'مكتسب القطعية', finalityMethod: 'انقضاء مدة الاعتراض', finalityStatement: 'حكم نهائي قابل للتنفيذ' },
    parties: { plaintiffs: [{ name: heirs[0].name, idType: 'هوية وطنية', idNumber: heirs[0].idNumber, nationality: 'سعودي', role: 'وارث' }], defendants: [] },
    deceased: {
      name: 'متوفى بذرة الانحدار', idType: 'هوية وطنية', idNumber: '1198639757', nationality: 'سعودي',
      dateOfDeathHijri: '1446-01-15', estateDocumentNumber: `EST-REG-${RUN}-${tag}`, estateDocumentDate: '1446-02-01',
      estateDocumentIssuedBy: 'محكمة الرياض', probateCertificateAttachment: `https://docs.example/probate/EST-REG-${RUN}-${tag}.pdf`,
    },
    estateAssets: {
      realEstate: [{ deedNumber: `37${RUN}${tag}`, deedDate: '1440-10-25', plotNumber: '77/ج', location: { city: 'الرياض', district: 'العارض' }, propertyType: 'أرض خام', currentStatus: 'فعال - صك إلكتروني', inquiryDocumentNumber: `INQ-37${RUN}${tag}`, inquiryDate: '1447-11-05', inquiryMethod: 'بوابة ناجز العقارية' }],
      vehicles: [],
      movables: [{ assetType: 'محفظة أسهم محلية', description: 'أسهم شركات سعودية', estimatedValue: 250000.0, referenceNumber: `STK-REG-${RUN}-${tag}`, custodian: 'شركة الاستثمار QA' }],
    },
    inheritanceDistribution: { legalBasis: 'المادة 180 من نظام الأحوال الشخصية', distributionRule: 'الأنصبة الشرعية المقدرة بالفرض والتعصيب', totalShares: 4, heirs },
    ruling: {
      verdictItems: [{ id: 1, title: 'الحكم بالتصفية القضائية', item: 'أولاً', description: 'إسناد تصفية أصول التركة لمركز الإسناد والتصفية (إنفاذ)' }],
      propertyDisposal: { method: 'بيع بالمزاد العلني الإلكتروني', deedNumber, deedDate: '1446-05-15' },
      objectionPeriod: { durationDays: 30, startFrom: 'تاريخ صدور صك الحكم النهائي', consequence: 'اكتساب القطعية' },
    },
    liquidationCenter: { name: 'مركز إنفاذ', appointmentBasis: 'قرار مجلس الوزراء', appointmentDate: '1446-03-01', feePercentage: 5.0, feeBase: 'صافي التركة', authorities: [{ id: 1, description: 'تقييم التركة' }, { id: 2, description: 'بيع وتصفية وقسمة التركة' }] },
    executiveFormula: { text: 'الصيغة التنفيذية الرسمية للحكم', issuedBy: 'محكمة الرياض', judicialDepartmentHead: 'القاضي عبدالله العتيبي' },
    metadata: { documentLanguage: 'ar', documentType: 'صك حكم تصفية نهائي', serviceType: 'ESTATE_REFERRAL', isRedacted: false, generatedAt: new Date().toISOString(), schemaVersion: '1.0' },
  };
}

// ── a known-good MOVABLE asset payload (from liquidator-asset-retest/18; movable needs no
//    deed/attachment upload, so it is the safest category to auto-create). ──────────────
function buildMovableAsset(desc: string) {
  return {
    assetCategory: 2,
    mode: 2,
    common: {
      isInsideKsa: true, country: null, source: 1, sourceOtherDescription: null,
      description: desc, descriptionAr: null, location: 'مستودع الرياض - حي العليا',
      cityName: 'الرياض', districtName: 'العليا',
      registeredOwnerName: 'المورث', isRegisteredUnderDeceasedName: true,
      relatedPersonHasRelationship: null, relatedPersonIdType: null, relatedPersonIdNumber: null,
      relatedPersonName: null, relatedPersonMobile: null, additionalNotes: null,
    },
    realEstate: null,
    vehicle: null,
    movable: { movableType: 'أثاث ومفروشات', movableSubType: 'أثاث منزلي', estimatedValue: 15000, location: 'مستودع الرياض - حي العليا' },
    attachments: [],
  };
}

// ── backend helpers (read-only except the gated referral / asset POSTs) ────────────────
async function emLogin(ctx: APIRequestContext): Promise<string | null> {
  try {
    const res = await ctx.post(`${API}/users/api/v1/auth/login`, { headers: jsonHeaders, data: { Email: EM.email, Password: EM.password } });
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

/** Count existing assets per category for a case (read-only, EstateManager-authorized). */
async function countAssetsByCategory(ctx: APIRequestContext, token: string, caseId: string) {
  const res = await ctx.get(`${API}/cases/api/v1/assets/by-case/${caseId}/grouped`, {
    headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) throw new Error(`assets by-case HTTP ${res.status()}`);
  const data = ((await res.json())?.data ?? {}) as Record<string, unknown>;
  const groups = [...((data.ungrouped as unknown[]) ?? []), ...((data.grouped as unknown[]) ?? [])] as Array<Record<string, unknown>>;
  const assets = groups.flatMap((g) => ((g.assets as unknown[]) ?? []) as Array<Record<string, unknown>>);
  const byCat: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const a of assets) {
    const cat = Number(a.assetCategory ?? a.assetType ?? a.category ?? 0);
    if (byCat[cat] !== undefined) byCat[cat] += 1;
  }
  return { total: assets.length, byCat };
}

// ── the two ensure-steps ───────────────────────────────────────────────────────────────
async function ensureEstates(ctx: APIRequestContext, token: string | null, n: number): Promise<void> {
  if (!token) {
    summary.manual.push('estates: could not verify (estate-manager API login failed) — set EM_EMAIL/EM_PASSWORD in .env, then re-run.');
    return;
  }
  let count: number;
  try {
    count = (await fetchCourtCases(ctx, token, 1)).totalCount;
  } catch (err) {
    summary.manual.push(`estates: could not read court-cases (${(err as Error).message}) — verify API reachability, then re-run.`);
    return;
  }
  if (count >= n) {
    summary.skipped.push(`estates: ${count} court-case(s) already exist (target ${n}) — nothing to create.`);
    log(`estates fixture OK — ${count} existing court-case(s) >= target ${n}, skipping creation.`);
    return;
  }
  const need = Math.min(n - count, CREATE_CAP);
  if (!COURT_KEY) {
    summary.manual.push(`estates: ${count}/${n} exist and COURT_API_KEY is not set — cannot POST referrals. Set COURT_API_KEY in .env and re-run to seed ${need} estate(s).`);
    log('estates fixture SHORT and no COURT_API_KEY — manual step needed.');
    return;
  }
  log(`estates: ${count}/${n} present — topping up ${need} (cap ${CREATE_CAP}) via POST /cases/api/v1/referrals ...`);
  for (let i = 0; i < need; i++) {
    if (DRY) {
      summary.created.push(`estates: [DRY] would POST 1 referral (${i + 1}/${need}).`);
      continue;
    }
    const res = await ctx.post(`${API}/cases/api/v1/referrals`, {
      headers: { ...jsonHeaders, 'X-Court-Api-Key': COURT_KEY },
      data: buildReferral(i + 1),
    });
    const bodyText = (await res.text()).slice(0, 200);
    if (res.status() < 300) {
      summary.created.push(`estates: seeded 1 referral (run ${RUN}-${i + 1}, HTTP ${res.status()}).`);
      log(`estate created — HTTP ${res.status()} ${bodyText}`);
    } else {
      summary.manual.push(`estates: referral POST returned HTTP ${res.status()} — check COURT_API_KEY / payload. Body: ${bodyText}`);
      log(`estate creation FAILED — HTTP ${res.status()} ${bodyText}. Stopping estate top-up.`);
      break; // stop on first failure — never hammer CIT with repeated 4xx/5xx
    }
  }
}

async function ensureAssets(ctx: APIRequestContext, token: string | null, caseIdArg: string, perType: number): Promise<void> {
  if (!token) {
    summary.manual.push('assets: could not verify (estate-manager API login failed).');
    return;
  }
  // Resolve the target case: explicit SEED_CASE_ID, else the first court-case in the list.
  let caseId = caseIdArg;
  let fileNumber = caseIdArg;
  if (!caseId) {
    try {
      const { items } = await fetchCourtCases(ctx, token, 1);
      const first = items[0];
      if (!first) {
        summary.manual.push('assets: no court-cases available to attach assets to — run ensureEstates first.');
        return;
      }
      caseId = String(first.caseId ?? first.id ?? first.courtCaseId ?? '');
      fileNumber = String(first.fileNumber ?? caseId);
    } catch (err) {
      summary.manual.push(`assets: could not resolve a target case (${(err as Error).message}).`);
      return;
    }
  }
  if (!caseId) {
    summary.manual.push('assets: could not determine a target caseId.');
    return;
  }

  let counts: { total: number; byCat: Record<number, number> };
  try {
    counts = await countAssetsByCategory(ctx, token, caseId);
  } catch (err) {
    summary.manual.push(`assets (${fileNumber}): could not read existing assets (${(err as Error).message}).`);
    return;
  }
  log(`assets: case ${fileNumber} (${caseId}) has ${counts.total} asset(s) — by category ${JSON.stringify(counts.byCat)}; target ${perType} per type.`);

  // Which categories are short of the per-type target?
  const shortfalls = CATEGORIES.map((c) => ({ ...c, have: counts.byCat[c.id] ?? 0 }))
    .filter((c) => c.have < perType);
  if (shortfalls.length === 0) {
    summary.skipped.push(`assets: ${fileNumber} already has >= ${perType} of every type — nothing to create.`);
    log('assets fixture OK — every category at/above target, skipping creation.');
    return;
  }

  // We can safely auto-create MOVABLE assets (no deed/attachment upload needed). Real-estate
  // and vehicle assets require a deed-PDF upload + extra fields, so those shortfalls are
  // reported as manual notes rather than half-built here.
  let budget = CREATE_CAP;
  for (const c of shortfalls) {
    const need = perType - c.have;
    if (c.id !== 2) {
      summary.manual.push(`assets: ${fileNumber} has ${c.have}/${perType} ${c.label} — auto-seed not attempted (needs deed-PDF upload + full DTD; add via the UI or extend the seeder).`);
      continue;
    }
    for (let i = 0; i < need && budget > 0; i++, budget--) {
      if (DRY) {
        summary.created.push(`assets: [DRY] would POST 1 ${c.label} to ${fileNumber} (${i + 1}/${need}).`);
        continue;
      }
      const res = await ctx.post(`${API}/cases/api/v1/assets/for-case/${caseId}`, {
        headers: { ...jsonHeaders, Authorization: `Bearer ${token}` },
        data: buildMovableAsset(`QA-REG-SEED-MV-${RUN}-${i + 1}`),
      });
      const bodyText = (await res.text()).slice(0, 300);
      if (res.status() < 300) {
        summary.created.push(`assets: seeded 1 ${c.label} on ${fileNumber} (HTTP ${res.status()}).`);
        log(`asset created — HTTP ${res.status()} ${bodyText}`);
      } else {
        // Verified on CIT: this endpoint is assigned-liquidator gated
        // (errorCode FORBIDDEN_NOT_ASSIGNED_LIQUIDATOR). The EstateManager actor is not the
        // assigned liquidator, and assignment is blocked by JF-1097 (site-config 500).
        summary.manual.push(
          `assets: ${fileNumber} — asset POST returned HTTP ${res.status()}. ` +
            `POST /assets/for-case/{caseId} is assigned-liquidator gated; the EstateManager actor cannot add assets and ` +
            `liquidator assignment is blocked by JF-1097. Seed via the assigned-liquidator session once JF-1097 clears. Body: ${bodyText}`,
        );
        log(`asset creation blocked — HTTP ${res.status()} ${bodyText}. Stopping asset top-up.`);
        return; // stop immediately — do not flood CIT with repeated forbidden POSTs
      }
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────────────────────
(async () => {
  log(`starting — API ${API}, tenant ${TENANT}${DRY ? ' [DRY RUN — no POSTs]' : ''}. Read-only except gated referral/asset POSTs.`);
  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  try {
    const token = await emLogin(ctx);
    await ensureEstates(ctx, token, ESTATE_TARGET);
    await ensureAssets(ctx, token, ASSET_CASE_ID, ASSETS_PER_TYPE);
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
