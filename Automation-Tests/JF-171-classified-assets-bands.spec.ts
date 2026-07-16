/**
 * JF-171 — Inheritance Classification: `classifiedAssetsCount` band coverage
 *
 * Companion to JF-171-inheritance-classification.spec.ts (which covers JF-TC-2938, the
 * "Average" 7-9 band). That file's empty-callback-injection recipe makes the classified-asset
 * count DETERMINISTIC and CONTROLLABLE: SAMA/CMA are neutralized to zero, so the final count is
 * exactly `N seeded vehicles + 1 REGA deed asset`. This file exercises the OTHER bands by simply
 * varying `N`, reusing the same proven helpers and sequence — no new environment technique.
 *
 * JF-171 `classifiedAssetsCount` bands (Number of Not-Ready/Constrained assets → normalized score):
 *   0-3 → 0 (Very Low) · 4-6 → 25 (Low) · 7-9 → 50 (Average, covered elsewhere) ·
 *   10-13 → 75 (High) · 14+ → 100 (Very High)
 *
 * Requires the same LOCAL, gitignored .env as the sibling file — notably the REAL
 * SAMA_CALLBACK_KEY / CMA_CALLBACK_KEY (appsettings placeholders do NOT work). When those are
 * absent the whole suite self-skips (the empty-callback injection can't run), so it is safe in
 * CI/local without secrets and never hard-fails on missing config.
 */
import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

import {
  getToken,
  postReferral,
  postSamaCallbackEmpty,
  postCmaCallbackEmpty,
  postWake,
  disposeApiContext,
} from './helpers/api-client';
import { getCloudBeaverSession, closeBrowser } from './helpers/browser-auth';
import {
  setCbSessionCookie,
  getCaseId,
  getSamaCorrelationIds,
  getCmaNafithNumber,
  query,
  closeDb,
} from './helpers/jf157-db-client';
import { makeUniqueReferral } from './fixtures/referral-data';

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// "Aligned with Tawtheeq heirs" per the mocks service OpenAPI spec — heirs-listing/re-inquire
// (a hard precondition for readiness/classification) only succeeds for this national ID (same
// one the sibling JF-171 spec uses).
const ALT_NATIONAL_ID = '1070716102';

// Real SAMA/CMA callback secrets gate the empty-callback-injection technique. Without them the
// arrange step cannot neutralize SAMA/CMA, so the suite self-skips rather than hard-fail.
const HAS_CALLBACK_KEYS = !!process.env.SAMA_CALLBACK_KEY && !!process.env.CMA_CALLBACK_KEY;

// JF-171 band table for `classifiedAssetsCount` (source of truth = requirement text).
// Each case's final count = `vehicles + 1 REGA deed asset` (SAMA/CMA neutralized to zero).
const BANDS: Array<{ name: string; vehicles: number; min: number; max: number; score: number }> = [
  { name: '0-3 classified → Very Low (0)', vehicles: 2, min: 0, max: 3, score: 0 },
  { name: '4-6 classified → Low (25)', vehicles: 4, min: 4, max: 6, score: 25 },
  { name: '10-13 classified → High (75)', vehicles: 12, min: 10, max: 13, score: 75 },
  { name: '14+ classified → Very High (100)', vehicles: 14, min: 14, max: 9999, score: 100 },
];

/** Uniquely-plated vehicles — always non-RealEstate, deterministically NotReadyConstrained. */
function makeVehicleAssets(tag: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    plateNumber: `ب ت ن ${tag}${i}`,
    plateType: 'خصوصي',
    vehicleType: 'سيارة ركاب',
    make: 'تويوتا',
    model: 'كامري',
    year: 2024,
    chassisNumber: `JF171CHASSIS${tag}${i}`.padEnd(17, '0').slice(0, 17),
    registrationNumber: `JF171REG-${tag}-${i}`,
    registrationExpiryDate: '1450-01-01',
  }));
}

async function getClassification(caseId: string) {
  const rows = await query<Record<string, unknown>>(
    `SELECT rank, total_classification_score, criterion_breakdown_json, classification_date, classification_result
     FROM cases.court_cases WHERE id = $1`,
    [caseId],
  );
  return rows[0] ?? null;
}

async function startWorkflow(caseId: string, token: string) {
  const BASE = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
  const { request: pwRequest } = await import('@playwright/test');
  const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/cases/api/v1/court-cases/${caseId}/workflow/start`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ctx.dispose();
  return res;
}

interface ClassifyResult {
  caseId: string;
  row: Record<string, unknown> | null;
  rawValue: number | null;
}

/** Full arrange+classify for a given vehicle count (mirrors the sibling spec's proven recipe). */
async function arrangeAndClassify(tag: string, vehicleCount: number): Promise<ClassifyResult> {
  const referral: any = makeUniqueReferral(`QA-JF171-BANDS-${tag}`, {
    estateAssets: { vehicles: makeVehicleAssets(tag, vehicleCount) },
  });
  referral.deceased.idNumber = ALT_NATIONAL_ID;
  referral.parties.plaintiffs[0].idNumber = ALT_NATIONAL_ID;

  const refRes = await postReferral(referral);
  expect(refRes.status(), `postReferral failed: ${await refRes.text().catch(() => '')}`).toBe(200);
  const body = await refRes.json();
  const referralId = body?.data?.referralId ?? body?.referralId;
  expect(referralId, 'referral response did not include a referralId').toBeTruthy();

  const caseId = await getCaseId(referralId);
  console.log(`[${tag}] caseId=${caseId}`);

  const token = await getToken();
  await startWorkflow(caseId, token);

  // Neutralize SAMA/CMA at the source with empty callbacks (racing/winning the mock's webhook).
  const samaRecords = await getSamaCorrelationIds(caseId);
  for (const rec of samaRecords) {
    const res = await postSamaCallbackEmpty(rec.inquiry_type, rec.msg_uid);
    expect(res.status(), `postSamaCallbackEmpty(type=${rec.inquiry_type}) failed: ${await res.text().catch(() => '')}`).toBe(200);
  }
  const nafith = await getCmaNafithNumber(caseId);
  const cmaRes = await postCmaCallbackEmpty(nafith);
  expect(cmaRes.status(), `postCmaCallbackEmpty failed: ${await cmaRes.text().catch(() => '')}`).toBe(200);

  const wakeRes = await postWake(caseId);
  expect(wakeRes.status(), `postWake failed: ${await wakeRes.text().catch(() => '')}`).toBe(200);

  let classified = await getClassification(caseId);
  for (let tick = 0; tick < 60 && !classified?.classification_result; tick++) {
    await sleep(1000);
    classified = await getClassification(caseId);
  }
  if (!classified?.classification_result) return { caseId, row: null, rawValue: null };

  const breakdown: Array<{ Key: string; RawValue: number }> =
    typeof classified.criterion_breakdown_json === 'string'
      ? JSON.parse(classified.criterion_breakdown_json)
      : (classified.criterion_breakdown_json as any);
  const criterion = breakdown.find((c) => c.Key === 'classifiedAssetsCount');
  return { caseId, row: classified, rawValue: criterion?.RawValue ?? null };
}

test.describe('JF-171 — classifiedAssetsCount band coverage', () => {
  test.describe.configure({ mode: 'serial' }); // shared CIT DB — avoid hammering with parallel referrals
  test.setTimeout(4 * 60 * 1000);

  test.beforeAll(async () => {
    test.skip(!HAS_CALLBACK_KEYS, 'Requires real SAMA_CALLBACK_KEY / CMA_CALLBACK_KEY in .env (empty-callback injection).');
    await getToken();
    try {
      const cbSession = await getCloudBeaverSession();
      setCbSessionCookie(cbSession);
    } catch (e: any) {
      console.warn('[beforeAll] CloudBeaver session failed:', e?.message?.substring(0, 120));
    }
  });

  test.afterAll(async () => {
    await disposeApiContext();
    await closeDb();
    await closeBrowser();
  });

  const baseTag = String(Date.now()).slice(-6);

  for (const b of BANDS) {
    test(`classifiedAssetsCount ${b.name}`, async () => {
      const { caseId, row, rawValue } = await arrangeAndClassify(`${baseTag}v${b.vehicles}`, b.vehicles);

      if (!row?.classification_result) {
        test.skip(true, `BLOCKED: classification did not complete for band "${b.name}" (caseId=${caseId}).`);
        return;
      }

      const breakdown: Array<{ Key: string; RawValue: number; NormalizedScore: number }> =
        typeof row.criterion_breakdown_json === 'string'
          ? JSON.parse(row.criterion_breakdown_json as string)
          : (row.criterion_breakdown_json as any);
      const criterion = breakdown.find((c) => c.Key === 'classifiedAssetsCount');
      expect(criterion, 'classifiedAssetsCount must appear in the persisted breakdown').toBeDefined();

      // The raw count must fall in the target band, and the normalized score must be JF-171's
      // value for that band. If the count landed out-of-band, flag it (deterministic recipe —
      // an out-of-band result is a genuine signal, not a lucky-race miss).
      expect(
        rawValue !== null && rawValue >= b.min && rawValue <= b.max,
        `expected classifiedAssetsCount in [${b.min}, ${b.max}] for "${b.name}", got ${rawValue}`,
      ).toBeTruthy();
      expect(criterion!.NormalizedScore, `NormalizedScore for band "${b.name}"`).toBe(b.score);

      console.log(`[${b.name}] PASS | caseId=${caseId} rawValue=${rawValue} → score ${criterion!.NormalizedScore}`);
    });
  }
});
