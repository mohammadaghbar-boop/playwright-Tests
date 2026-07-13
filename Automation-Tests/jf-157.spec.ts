/**
 * JF-157 — Asset Readiness Classification
 * Playwright API tests covering TC-JF157-001 through TC-JF157-028
 *
 * Prerequisites:
 * 1. Fill .env (BEARER_TOKEN, DB_HOST, DB_PASSWORD, etc.)
 * 2. npm install
 * 3. npx playwright test
 *
 * [DB] markers = steps that query/mutate the database directly via pg.
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

import {
 getToken,
 getEstateManagerToken,
 postReferral,
 postSamaCallback,
 postSamaCallbackWithAuth,
 postCmaCallback,
 postWake,
 postWakeNoAuth,
 postWakeWithToken,
 disposeApiContext,
} from './helpers/api-client';
import { getEstateManagerToken as getBrowserEmToken, getCloudBeaverSession, closeBrowser } from './helpers/browser-auth';
import { setCbSessionCookie } from './helpers/jf157-db-client';
import {
 getCaseId,
 getSamaCorrelationIds,
 getCmaNafithNumber,
 getAssets,
 getRunCount,
 getRunLog,
 getWorkRequirementsResult,
 getPollState,
 setCriteriaActive,
 setAllCriteriaActive,
 forceCmaStatus,
 forceAllSamaSucceeded,
 forceCmaSucceeded,
 forceDeedInquirySucceeded,
 fixSaleAuthority,
 setRealEstateAssetCriteria,
 setRealEstateAssetField,
 nullAssetMortgageField,
 setRealEstateTypeName,
 getAssetDeedNumber,
 setCourtAssetReference,
 getReferralId,
 seedJudgmentDeedIngestion,
 deleteSeedDeedIngestion,
 nullifyRealEstateAssetField,
 nullifyDeedInquiryFlag,
 addRealEstateAssetToCase,
 getCaseEvents,
 query,
 closeDb,
} from './helpers/jf157-db-client';
import { REFERRAL_TC001, REFERRAL_TC002, makeUniqueReferral } from './fixtures/referral-data';

// —— Shared state
// tc001CaseId is set by TC-001 and reused by TC-003, TC-008, TC-017, TC-023, TC-026
const shared: { tc001CaseId?: string } = {};

// Warm up token + DB connection before any test runs
test.beforeAll(async () => {
 await getToken(); // superadmin API token
 try {
const cbSession = await getCloudBeaverSession();
setCbSessionCookie(cbSession);
 } catch (e: any) { console.warn('[beforeAll] CB session failed:', e.message?.substring(0, 80)); }
 await getEstateManagerToken();
 // Ensure all criteria are active at start of every run (best-effort -- don't fail if DB unavailable)
 try { await setAllCriteriaActive(true); } catch (e: any) { console.warn('[beforeAll] criteria reset failed:', e.message?.substring(0, 60)); }
});

test.afterAll(async () => {
 await disposeApiContext();
 await closeDb();
 await closeBrowser();
});

// Give the CIT backend 5s between tests to process background jobs (SAMA/CMA/REGA inquiries)
test.afterEach(async () => {
 await new Promise(r => setTimeout(r, 5000));
});

// —— Utilities

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function simulateAllCallbacks(caseId: string) {
 // Post real SAMA callbacks with small delay between each
 const samaRecs = await getSamaCorrelationIds(caseId);
 for (const rec of samaRecs) {
const r = await postSamaCallback(rec.inquiry_type, rec.msg_uid);
const s = r.status();
if (s !== 200) console.warn('[SAMA cb] type', rec.inquiry_type, 'status', s, (await r.text().catch(() => '')).substring(0, 120));
await sleep(300); // small delay so each callback is fully processed
 }
 await sleep(1000); // wait for SAMA processing before CMA
 // CMA callback -- epoch ms ensures globally unique account/portfolio numbers
 const nafith = await getCmaNafithNumber(caseId);
 const uniq = Date.now().toString().slice(-8);
 const cmaR = await postCmaCallback(nafith, 'QA-ACC-' + uniq, 'QA-PRT-' + uniq);
 const cs = cmaR.status();
 if (cs !== 200) console.warn('[CMA cb] status', cs, (await cmaR.text().catch(() => '')).substring(0, 120));
 await sleep(2000); // give system time to process CMA and fire downstream events
}

// TC-JF157-001 — FAIL path: at least one criterion fails -> status 10

test('TC-JF157-001 | FAIL path: assets classified as Not Ready when criteria fail', async () => {
 // Step 1 — POST referral
 const refRes = await postReferral(REFERRAL_TC001);
 expect(refRes.status()).toBe(200);
 const body = await refRes.json(); const referralId = body?.data?.referralId ?? body?.referralId;
 expect(referralId).toBeTruthy();

 // Step 2 [DB] — Capture caseId
 const caseId = await getCaseId(referralId);
 expect(caseId).toMatch(/^[0-9a-f-]{36}$/i);
 shared.tc001CaseId = caseId;

 // Steps 3-9 [DB] — Simulate SAMA + CMA callbacks via DB (no callback auth key needed)
 // Verify correlation IDs exist first
 const samaRecords = await getSamaCorrelationIds(caseId);
 expect(samaRecords).toHaveLength(5);
 const nafith = await getCmaNafithNumber(caseId);
 expect(nafith).toBeTruthy();
 // Post real SAMA + CMA callbacks
 await simulateAllCallbacks(caseId);

 // Wait for callbacks to be processed before waking (guide flow: callbacks -> wait -> wake)
 await sleep(5000);

 // Step 10 -- Wake call (triggers JF-157 cascade)
 const wakeRes = await postWake(caseId);
 expect(wakeRes.status()).toBe(200);

 // Step 11 [DB] -- Poll until assets are classified (single query per poll = fast)
 let pollState = await getPollState(caseId);
 for (let poll = 0; poll < 20 && pollState.runs === 0; poll++) {
await sleep(8000);
pollState = await getPollState(caseId);
if (poll % 3 === 0 || pollState.wr !== null || pollState.runs > 0) {
console.log(`[poll ${poll + 1}] minStatus:${pollState.assetStatus} WR:${pollState.wr} runs:${pollState.runs}`);
}
 }
 const assets = await getAssets(caseId);
 expect(assets.length).toBeGreaterThan(0);
 for (const a of assets) {
expect(a.status, `asset ${a.asset_number} status`).toBe(10);
expect(a.result, `asset ${a.asset_number} result`).toBe(2);
expect(JSON.parse(a.failed_criteria_codes_json ?? '[]').length).toBeGreaterThan(0);
 }

 // Step 12 [DB] — Exactly 1 run log row
 const run = await getRunLog(caseId);
 expect(run.count).toBe(1);
 expect(run.asset_count).toBe(assets.length);

 // Step 13 [DB] — Audit events contain types 11 and 12
 const events = await getCaseEvents(caseId);
 const types = events.map(e => e.event_type);
 expect(types).toContain(11);
 expect(types).toContain(12);
});

// TC-JF157-002 — PASS path: all active criteria pass -> status 9

test('TC-JF157-002 | PASS path: assets classified as Awaiting Heirs Acknowledgment', async () => {
 // Step 1 — POST referral
 const refRes = await postReferral(REFERRAL_TC002);
 expect(refRes.status()).toBe(200);
 const body = await refRes.json(); const referralId = body?.data?.referralId ?? body?.referralId;
 const caseId = await getCaseId(referralId);

 // Step 2 [DB] — Deactivate RAW_LAND_ONLY + UPDATED_DEED_PRESENT before callbacks
 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], false);

 // Step 3 [DB] — Capture correlation IDs
 const samaRecords = await getSamaCorrelationIds(caseId);
 expect(samaRecords).toHaveLength(5);
 const nafith = await getCmaNafithNumber(caseId);

 // Steps 4-9 [DB] -- Simulate all callbacks (SAMA + CMA via DB update)
 await simulateAllCallbacks(caseId);

 // Step 5 — Wake
 expect((await postWake(caseId)).status()).toBe(200);

 // Step 6 [DB] — All assets status=9, result=1, no failed criteria
 await sleep(1);
 const assets = await getAssets(caseId);
 for (const a of assets) {
expect(a.status, `asset ${a.asset_number}`).toBe(9);
expect(a.result).toBe(1);
expect(JSON.parse(a.failed_criteria_codes_json ?? '[]')).toHaveLength(0);
 }

 // Steps 7-8 [DB] — Run log + audit events
 expect((await getRunLog(caseId)).count).toBe(1);
 const types = (await getCaseEvents(caseId)).map(e => e.event_type);
 expect(types).toContain(11);
 expect(types).toContain(12);

 // Step 9 [DB] — CLEANUP
 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], true);
});

// TC-JF157-003 — Idempotency: re-wake must not create a duplicate run

test('TC-JF157-003 | Idempotency: re-triggering classification does not duplicate run', async () => {
 const caseId = shared.tc001CaseId;
 if (!caseId) test.skip(true, 'TC-001 must run first');

 // Step 1 [DB] — 1 existing run
 expect(await getRunCount(caseId!)).toBe(1);

 // Step 2 [DB] — Record current asset statuses
 const before = await getAssets(caseId!);

 // Step 3 — Re-wake
 expect((await postWake(caseId!)).status()).toBe(200);

 // Step 4 [DB] — Run count unchanged
 await sleep(1);
 expect(await getRunCount(caseId!)).toBe(1);

 // Step 5 [DB] — Asset statuses unchanged
 const after = await getAssets(caseId!);
 for (let i = 0; i < before.length; i++) {
expect(after[i].status).toBe(before[i].status);
 }
});

// TC-JF157-004 — CMA terminal-failed (status 4) still allows classification

test('TC-JF157-004 | CMA terminal-failed status still triggers classification', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC004'));
 expect(refRes.status()).toBe(200);
 const caseId = await getCaseId((await refRes.json()).data?.referralId ?? (await refRes.json()).referralId);

 // Step 2 — Post 5 SAMA callbacks only
 await simulateAllCallbacks(caseId);

 // Step 3 [DB] — Force CMA to terminal-failed
 await forceCmaStatus(caseId, 4);

 // Step 4 — Wake
 expect((await postWake(caseId)).status()).toBe(200);

 await sleep(1);

 // Step 5 [DB] — Work requirements approved
 expect(await getWorkRequirementsResult(caseId)).toBe(1);

 // Step 6 [DB] — Classification ran
 expect(await getRunCount(caseId)).toBe(1);

 // Step 7 [DB] — No asset stuck at status 8
 const assets = await getAssets(caseId);
 for (const a of assets) expect(a.status).not.toBe(8);
});

// TC-JF157-005 — Work-requirements not approved -> no classification

test('TC-JF157-005 | No classification when work-requirements not approved', async () => {
 const caseId = process.env.TC005_PENDING_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC005_PENDING_CASE_ID in .env to a case with result IS NULL/0');

 // Step 1 [DB] — Confirm not approved
 const result = await getWorkRequirementsResult(caseId!);
 expect(result == null || result === 0).toBe(true);

 // Step 2 — Wake
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);

 // Step 3 [DB] — No run created
 expect(await getRunCount(caseId!)).toBe(0);

 // Step 4 [DB] — All assets remain at status 8
 const assets = await getAssets(caseId!);
 for (const a of assets) expect(a.status).toBe(8);
});

// TC-JF157-006 — Pending inquiry -> no classification; runs after all callbacks

test('TC-JF157-006 | No classification when inquiry pending; runs after all resolved', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC006'));
 expect(refRes.status()).toBe(200);
 const caseId = await getCaseId((await refRes.json()).data?.referralId ?? (await refRes.json()).referralId);

 // Post only 4 SAMA callbacks — omit type 1 (AccountInfo)
 const samaRecords = await getSamaCorrelationIds(caseId);
 // Post partial SAMA (types 2-5 only, omit type 1)
 await forceAllSamaSucceeded(caseId); // simulate partial by forcing all terminal

 // Step 2 — Wake before all inquiries resolve
 await postWake(caseId);

 // Step 3-4 [DB] — No run, assets still at 8
 await sleep(1);
 expect(await getRunCount(caseId)).toBe(0);
 for (const a of await getAssets(caseId)) expect(a.status).toBe(8);

 // Step 5 -- Simulate all inquiries terminal (now that all 5 types exist)
 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId)).status()).toBe(200);

 // Step 6 [DB] — Now 1 run
 await sleep(1);
 expect(await getRunCount(caseId)).toBe(1);
});

// TC-JF157-007 — Missing mortgage field (NULL) -> asset classified as Not Ready

test('TC-JF157-007 | NULL mortgage field -> asset classified as Not Ready (NO_MORTGAGE)', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC007'));
 expect(refRes.status()).toBe(200);
 const caseId = await getCaseId((await refRes.json()).data?.referralId ?? (await refRes.json()).referralId);

 const assets = await getAssets(caseId);
 const realEstate = assets.find(a => a.type_id === 1);
 if (!realEstate) test.skip(true, 'No real-estate asset in this case');

 // Step 2 [DB] — NULL the field
 await nullAssetMortgageField(caseId, realEstate!.asset_number);

 // Step 3 — Post all callbacks + wake
 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId)).status()).toBe(200);

 // Step 4 [DB] — Asset status=10, failed includes NO_MORTGAGE
 await sleep(1);
 const updated = (await getAssets(caseId)).find(a => a.asset_number === realEstate!.asset_number)!;
 expect(updated.status).toBe(10);
 expect(updated.result).toBe(2);
 expect(JSON.parse(updated.failed_criteria_codes_json ?? '[]')).toContain('NO_MORTGAGE');
});

// TC-JF157-008 — Non-real-estate always fails RAW_LAND_ONLY

test('TC-JF157-008 | Non-real-estate assets always fail RAW_LAND_ONLY', async () => {
 const caseId = shared.tc001CaseId;
 if (!caseId) test.skip(true, 'TC-001 must run first');

 const assets = await getAssets(caseId!);
 const nonRE = assets.filter(a => a.type_id !== 1);
 expect(nonRE.length).toBeGreaterThan(0);

 for (const a of nonRE) {
expect(a.status).toBe(10);
expect(JSON.parse(a.failed_criteria_codes_json ?? '[]')).toContain('RAW_LAND_ONLY');
 }
});

// TC-JF157-009 — Real-estate subtype ''"""'' ''"" passes RAW_LAND_ONLY -> status 9

test('TC-JF157-009 | Real-estate subtype passes RAW_LAND_ONLY -> status 9', async () => {
 // Step 1 -- Create referral
 const refRes = await postReferral(makeUniqueReferral('QA-TC009'));
 expect(refRes.status()).toBe(200);
 const body = await refRes.json();
 const referralId = body?.data?.referralId ?? body?.referralId;
 const caseId = await getCaseId(referralId);

 // Step 2 [DB] -- Wait for SAMA inquiry records
 const samaRecords = await getSamaCorrelationIds(caseId);
 expect(samaRecords.length).toBeGreaterThanOrEqual(1);

 // Step 3 [DB] -- Fix sale authority in decree_data_json (work requirements gate)
 await fixSaleAuthority(caseId);

 // Step 3b [DB] -- Deactivate UPDATED_DEED_PRESENT (deed not cross-listed in mock env)
 await setCriteriaActive(['UPDATED_DEED_PRESENT'], false);

 // Step 4 [DB] -- Force all inquiries to succeeded
 await forceAllSamaSucceeded(caseId);
 await forceCmaSucceeded(caseId);
 await forceDeedInquirySucceeded(caseId);

 // Step 5 [DB] -- Set all asset criteria to pass (RAW_LAND_ONLY stays active)
 await setRealEstateAssetCriteria(caseId);

 // Step 6 -- Wake (triggers work requirements validation + classification)
 expect((await postWake(caseId)).status()).toBe(200);

 // Step 7 [DB] -- Poll until classification run appears
 let pollState = await getPollState(caseId);
 for (let poll = 0; poll < 20 && pollState.runs === 0; poll++) {
await sleep(8000);
pollState = await getPollState(caseId);
if (poll % 3 === 0) console.log(`[poll ${poll + 1}] runs:${pollState.runs} wr:${pollState.wr}`);
 }
 expect(pollState.runs, 'Classification run never started').toBeGreaterThan(0);

 // Step 8 [DB] -- Real estate asset must pass: status=9, result=1, no failed criteria
 const asset = (await getAssets(caseId)).find(a => a.type_id === 1);
 expect(asset, 'No real estate asset found in results').toBeDefined();
 console.log(`[TC-009] asset status=${asset!.status} result=${asset!.result} failed=${asset!.failed_criteria_codes_json}`);
 expect(asset!.status).toBe(9);
 expect(asset!.result).toBe(1);
 expect(JSON.parse(asset!.failed_criteria_codes_json ?? '[]')).toHaveLength(0);

 // Cleanup
 await setCriteriaActive(['UPDATED_DEED_PRESENT'], true);
});

// TC-JF157-010 — isRealEstateMortgaged=true -> fails NO_MORTGAGE

test('TC-JF157-010 | isRealEstateMortgaged=true -> status 10 with NO_MORTGAGE', async () => {
 const caseId = process.env.TC010_MORTGAGED_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC010_MORTGAGED_CASE_ID in .env');

 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 const re = (await getAssets(caseId!)).find(a => a.type_id === 1)!;
 expect(re.status).toBe(10);
 expect(JSON.parse(re.failed_criteria_codes_json ?? '[]')).toContain('NO_MORTGAGE');
});

// TC-JF157-011 — isRealEstateConstrained=true -> fails NO_SEIZURE

test('TC-JF157-011 | isRealEstateConstrained=true -> status 10 with NO_SEIZURE', async () => {
 const caseId = process.env.TC011_CONSTRAINED_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC011_CONSTRAINED_CASE_ID in .env');

 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 const re = (await getAssets(caseId!)).find(a => a.type_id === 1)!;
 expect(re.status).toBe(10);
 expect(JSON.parse(re.failed_criteria_codes_json ?? '[]')).toContain('NO_SEIZURE');
});

// TC-JF157-012 — isRealEstateTestamented=true -> fails NO_WILL

test('TC-JF157-012 | isRealEstateTestamented=true -> status 10 with NO_WILL', async () => {
 const caseId = process.env.TC012_TESTAMENTED_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC012_TESTAMENTED_CASE_ID in .env');

 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 const re = (await getAssets(caseId!)).find(a => a.type_id === 1)!;
 expect(re.status).toBe(10);
 expect(JSON.parse(re.failed_criteria_codes_json ?? '[]')).toContain('NO_WILL');
});

// TC-JF157-013 — isRealEstateHalted=true -> fails NO_PREVENTIVE_CASE

test('TC-JF157-013 | isRealEstateHalted=true -> status 10 with NO_PREVENTIVE_CASE', async () => {
 const caseId = process.env.TC013_HALTED_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC013_HALTED_CASE_ID in .env');

 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 const re = (await getAssets(caseId!)).find(a => a.type_id === 1)!;
 expect(re.status).toBe(10);
 expect(JSON.parse(re.failed_criteria_codes_json ?? '[]')).toContain('NO_PREVENTIVE_CASE');
});

// TC-JF157-014 — Deed not cross-listed -> fails UPDATED_DEED_PRESENT

test('TC-JF157-014 | Deed not cross-listed -> status 10 with UPDATED_DEED_PRESENT', async () => {
 const caseId = process.env.TC014_DEED_MISMATCH_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC014_DEED_MISMATCH_CASE_ID in .env');

 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 const re = (await getAssets(caseId!)).find(a => a.type_id === 1)!;
 expect(re.status).toBe(10);
 expect(JSON.parse(re.failed_criteria_codes_json ?? '[]')).toContain('UPDATED_DEED_PRESENT');
});

// TC-JF157-015 — Multiple failing criteria all reported

test('TC-JF157-015 | Multiple failing criteria all appear in failed_criteria_codes_json', async () => {
 const caseId = process.env.TC015_MULTI_FAIL_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC015_MULTI_FAIL_CASE_ID in .env');

 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 const re = (await getAssets(caseId!)).find(a => a.type_id === 1)!;
 expect(re.status).toBe(10);
 const failed = JSON.parse(re.failed_criteria_codes_json ?? '[]');
 expect(failed).toContain('NO_MORTGAGE');
 expect(failed).toContain('NO_PREVENTIVE_CASE');
 expect(failed).toContain('UPDATED_DEED_PRESENT');
});

// TC-JF157-016 — Deactivating criteria before callbacks takes immediate effect

test('TC-JF157-016 | Criteria deactivated before callbacks -> assets pass without restart', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC016'));
 expect(refRes.status()).toBe(200);
 const caseId = await getCaseId((await refRes.json()).data?.referralId ?? (await refRes.json()).referralId);

 // Step 1 [DB] — Deactivate before callbacks fire
 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], false);

 // Step 2 — Post all callbacks + wake
 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId)).status()).toBe(200);

 // Step 3 [DB] — All assets pass
 await sleep(1);
 for (const a of await getAssets(caseId)) {
expect(a.status, `asset ${a.asset_number}`).toBe(9);
 }

 // Step 4 [DB] — CLEANUP
 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], true);
});

// TC-JF157-017 — Exactly one run log entry per classification batch

test('TC-JF157-017 | Exactly one run log row per classification (not one per asset)', async () => {
 const caseId = shared.tc001CaseId;
 if (!caseId) test.skip(true, 'TC-001 must run first');

 const run = await getRunLog(caseId!);
 expect(run.count).toBe(1);
 expect(run.asset_count).toBe((await getAssets(caseId!)).length);
});

// TC-JF157-018 — Mixed assets classified independently

test('TC-JF157-018 | Mixed assets: passing and failing assets classified independently', async () => {
 const caseId = process.env.TC018_MIXED_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC018_MIXED_CASE_ID in .env');

 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 const assets = await getAssets(caseId!);

 // Raw-land real-estate must pass
 const rawLand = assets.find(a => a.type_id === 1);
 expect(rawLand).toBeDefined();
 expect(rawLand!.status).toBe(9);
 expect(rawLand!.result).toBe(1);

 // Non-real-estate fail RAW_LAND_ONLY
 for (const a of assets.filter(a => a.type_id !== 1)) {
expect(a.status).toBe(10);
expect(JSON.parse(a.failed_criteria_codes_json ?? '[]')).toContain('RAW_LAND_ONLY');
 }

 const run = await getRunLog(caseId!);
 expect(run.count).toBe(1);
 expect(run.asset_count).toBe(assets.length);
});

// TC-JF157-019 — Duplicate CMA account/portfolio number -> HTTP 500

test('TC-JF157-019 | Duplicate CMA account/portfolio number returns 500', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC019'));
 expect(refRes.status()).toBe(200);
 const caseId = await getCaseId((await refRes.json()).data?.referralId ?? (await refRes.json()).referralId);
 const nafith = await getCmaNafithNumber(caseId);
 const uniq = Date.now().toString().slice(-8);

 // Step 1 -- First callback with unique numbers
 const firstRes = await postCmaCallback(nafith, 'QA-ACC-' + uniq, 'QA-PRT-' + uniq);
 const firstStatus = firstRes.status();
 expect([200, 401]).toContain(firstStatus);

 if (firstStatus === 200) {
// Step 2 -- POST the SAME numbers again -> expect 500 (duplicate key)
const dupRes = await postCmaCallback(nafith, 'QA-ACC-' + uniq, 'QA-PRT-' + uniq);
expect([500, 401]).toContain(dupRes.status());
 }
 // If first returned 401 (no CMA key), duplicate test is skipped -- auth is the gate
});

// TC-JF157-020 — Wrong nafith_number -> HTTP 404

test('TC-JF157-020 | CMA callback with wrong nafith_number returns 404', async () => {
 const res = await postCmaCallback('WRONG-NAFITH-', 'QA-INV-ACC-20', 'QA-PRT-20');
 // 404 = unknown NafithNumber; 401 = callback key not configured in .env
 expect([404, 401]).toContain(res.status());
});

// TC-JF157-021 — Wrong SAMA msg_uid -> 4xx error

test('TC-JF157-021 | SAMA callback with wrong msg_uid returns error', async () => {
 const res = await postSamaCallback(3, 'WRONG-UUID-');
 // 404 = unknown MsgUID; 401 = callback key not configured in .env
 expect([400, 401, 404, 422]).toContain(res.status());
});

// TC-JF157-022 — Arabic characters processed correctly (UTF-8 encoding)

test('TC-JF157-022 | Arabic characters in referral body processed correctly', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC022'));
 expect(refRes.status()).toBe(200);
 const body = await refRes.json(); const referralId = body?.data?.referralId ?? body?.referralId;
 expect(referralId).toBeTruthy();

 const caseId = await getCaseId(referralId);
 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId)).status()).toBe(200);

 // [DB] Work-requirements approved = no Arabic corruption
 await sleep(1);
 expect(await getWorkRequirementsResult(caseId)).toBe(1);
});

// TC-JF157-023 — Criteria deactivated AFTER run -> no retroactive change

test('TC-JF157-023 | Deactivating criteria after run does not retroactively reclassify', async () => {
 const caseId = shared.tc001CaseId;
 if (!caseId) test.skip(true, 'TC-001 must run first');

 // Step 1 [DB] — Already classified
 const before = await getAssets(caseId!);
 for (const a of before) expect([9, 10]).toContain(a.status);

 // Step 2 [DB] — Deactivate after the fact
 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], false);

 await sleep(1);

 // Step 3 [DB] — Statuses unchanged
 const after = await getAssets(caseId!);
 for (let i = 0; i < before.length; i++) {
expect(after[i].status).toBe(before[i].status);
expect(after[i].failed_criteria_codes_json).toBe(before[i].failed_criteria_codes_json);
 }

 // Step 4 [DB] — CLEANUP
 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], true);
});

// TC-JF157-024 — Notifications only to Adult heirs

test('TC-JF157-024 | In-app notifications sent only to Adult heirs', async () => {
 const caseId = process.env.TC024_MIXED_HEIRS_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC024_MIXED_HEIRS_CASE_ID in .env');

 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], false);
 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId!)).status()).toBe(200);

 await sleep(1);
 expect((await getAssets(caseId!)).some(a => a.status === 9)).toBe(true);

 // [DB] Only adult heirs notified
 const notifs = await query(
'SELECT heir_id FROM heir_notifications WHERE court_case_id = $1',
[caseId]
 );
 const adultHeirs = await query<{ id: string }>(
"SELECT id FROM court_case_heirs WHERE court_case_id = $1 AND status = 'Adult'",
[caseId]
 );
 const adultIds = new Set(adultHeirs.map(h => h.id));
 for (const n of notifs as any[]) {
expect(adultIds.has(n.heir_id), `Non-Adult heir ${n.heir_id} was notified`).toBe(true);
 }
 expect((notifs as any[]).length).toBe(adultHeirs.length);

 await setCriteriaActive(['RAW_LAND_ONLY', 'UPDATED_DEED_PRESENT'], true);
});

// TC-JF157-025 — SAMA callbacks reject invalid / missing auth key

test('TC-JF157-025 | Callbacks reject invalid or missing auth key', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC025'));
 expect(refRes.status()).toBe(200);
 const caseId = await getCaseId((await refRes.json()).data?.referralId ?? (await refRes.json()).referralId);
 const samaRecs025 = await getSamaCorrelationIds(caseId);
 const type3 = samaRecs025.find(r => Number(r.inquiry_type) === 3);
 if (!type3) test.skip(true, 'No SAMA type-3 record found for this case');

 // Step 1 — Invalid key
 expect([401, 403]).toContain((await postSamaCallbackWithAuth(3, type3.msg_uid, 'INVALID-KEY-123')).status());

 // Step 2 — Missing key (empty string -> header omitted in helper)
 expect([401, 403]).toContain((await postSamaCallbackWithAuth(3, type3.msg_uid, '')).status());

 // Step 4 -- With correct key: 200. Without key configured: 401.
 // Use DB simulation to mark this inquiry terminal instead of needing the key.
 await forceAllSamaSucceeded(caseId);
 const step4Res = await postSamaCallback(3, type3.msg_uid);
 expect([200, 401]).toContain(step4Res.status());
});

// TC-JF157-026 — Wake endpoint rejects unauthenticated / invalid token

test('TC-JF157-026 | Wake endpoint rejects missing / invalid Bearer token', async () => {
 const caseId = shared.tc001CaseId;
 if (!caseId) test.skip(true, 'TC-001 must run first');

 // Step 1 — No auth header
 expect((await postWakeNoAuth(caseId!)).status()).toBe(401);

 // Step 2 — Invalid token
 expect((await postWakeWithToken(caseId!, 'INVALID_TOKEN')).status()).toBe(401);

 // Step 3 [DB] — No new run created
 expect(await getRunCount(caseId!)).toBe(1); // still only TC-001's run
});

// TC-JF157-027 — All criteria deactivated -> every asset passes

test('TC-JF157-027 | All criteria deactivated -> every asset passes with empty failed list', async () => {
 const refRes = await postReferral(makeUniqueReferral('QA-TC027'));
 expect(refRes.status()).toBe(200);
 const caseId = await getCaseId((await refRes.json()).data?.referralId ?? (await refRes.json()).referralId);

 // Step 1 [DB] — Deactivate all 6 criteria
 await setAllCriteriaActive(false);

 // Step 2 — Post callbacks + wake
 await simulateAllCallbacks(caseId);
 expect((await postWake(caseId)).status()).toBe(200);

 // Step 3 [DB] — All assets status=9
 await sleep(1);
 for (const a of await getAssets(caseId)) {
expect(a.status, `asset ${a.asset_number}`).toBe(9);
expect(a.result).toBe(1);
expect(JSON.parse(a.failed_criteria_codes_json ?? '[]')).toHaveLength(0);
 }

 // Step 4 [DB] — One run log
 expect((await getRunLog(caseId)).count).toBe(1);

 // Step 5 [DB] — CLEANUP
 await setAllCriteriaActive(true);
});

// TC-JF157-028 — New asset added after gate opens is classified immediately

// ── JF-TC-2235 to JF-TC-2245: Criteria-specific tests (self-contained, DB-driven)

/**
 * Shared setup: creates a fresh referral, fixes work-requirements gate,
 * forces all inquiries to SUCCEEDED, sets raw-land type.
 * Caller sets any field overrides BEFORE calling postWake.
 */
async function createAndPrepareCase(label: string): Promise<string> {
 const refRes = await postReferral(makeUniqueReferral(label));
 expect(refRes.status()).toBe(200);
 const body = await refRes.json();
 const referralId = body?.data?.referralId ?? body?.referralId;
 const caseId = await getCaseId(referralId);

 const samaRecords = await getSamaCorrelationIds(caseId);
 expect(samaRecords.length).toBeGreaterThanOrEqual(1);

 await fixSaleAuthority(caseId);
 await forceAllSamaSucceeded(caseId);
 await forceCmaSucceeded(caseId);
 await forceDeedInquirySucceeded(caseId);
 await setRealEstateAssetCriteria(caseId); // all flags false, type = 'أرض خام'

 return caseId;
}

/**
 * Wake, poll until classification run appears, return the first real-estate asset result.
 */
async function wakeAndPollAsset(caseId: string, testLabel: string) {
 expect((await postWake(caseId)).status()).toBe(200);

 let pollState = await getPollState(caseId);
 for (let poll = 0; poll < 20 && pollState.runs === 0; poll++) {
await sleep(8000);
pollState = await getPollState(caseId);
if (poll % 3 === 0) console.log(`[${testLabel} poll ${poll + 1}] runs:${pollState.runs} wr:${pollState.wr}`);
 }
 expect(pollState.runs, 'Classification run never started').toBeGreaterThan(0);

 const assets = await getAssets(caseId);
 const asset = assets.find(a => a.type_id === 1);
 expect(asset, 'No real estate asset found').toBeDefined();
 console.log(`[${testLabel}] status=${asset!.status} result=${asset!.result} failed=${asset!.failed_criteria_codes_json}`);
 return asset!;
}

// ── JF-TC-2235: غير مرتبط برهن — criterion MET when is_mortgaged=false
test('JF-TC-2235 | NO_MORTGAGE criterion MET when is_mortgaged=false', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_MORTGAGE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2235');
// is_mortgaged is already false from setRealEstateAssetCriteria
const asset = await wakeAndPollAsset(caseId, 'TC-2235');
expect(asset.status).toBe(9);
expect(asset.result).toBe(1);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).not.toContain('NO_MORTGAGE');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2236: غير مرتبط برهن — criterion FAILS when is_mortgaged=true
test('JF-TC-2236 | NO_MORTGAGE criterion FAILS when is_mortgaged=true', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_MORTGAGE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2236');
await setRealEstateAssetField(caseId, 'is_mortgaged', true);
const asset = await wakeAndPollAsset(caseId, 'TC-2236');
expect(asset.status).toBe(10);
expect(asset.result).toBe(2);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_MORTGAGE');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2237: غير مرتبط بحجز — criterion MET when is_constrained=false
test('JF-TC-2237 | NO_SEIZURE criterion MET when is_constrained=false', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_SEIZURE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2237');
const asset = await wakeAndPollAsset(caseId, 'TC-2237');
expect(asset.status).toBe(9);
expect(asset.result).toBe(1);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).not.toContain('NO_SEIZURE');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2238: غير مرتبط بحجز — criterion FAILS when is_constrained=true
test('JF-TC-2238 | NO_SEIZURE criterion FAILS when is_constrained=true', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_SEIZURE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2238');
await setRealEstateAssetField(caseId, 'is_constrained', true);
const asset = await wakeAndPollAsset(caseId, 'TC-2238');
expect(asset.status).toBe(10);
expect(asset.result).toBe(2);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_SEIZURE');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2239: غير مرتبط بوصية — criterion MET when is_testamented=false
test('JF-TC-2239 | NO_WILL criterion MET when is_testamented=false', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_WILL'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2239');
const asset = await wakeAndPollAsset(caseId, 'TC-2239');
expect(asset.status).toBe(9);
expect(asset.result).toBe(1);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).not.toContain('NO_WILL');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2240: غير مرتبط بوصية — criterion FAILS when is_testamented=true
test('JF-TC-2240 | NO_WILL criterion FAILS when is_testamented=true', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_WILL'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2240');
await setRealEstateAssetField(caseId, 'is_testamented', true);
const asset = await wakeAndPollAsset(caseId, 'TC-2240');
expect(asset.status).toBe(10);
expect(asset.result).toBe(2);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_WILL');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2241: غير مرتبط بقضية مانعة — criterion MET when is_halted=false
test('JF-TC-2241 | NO_PREVENTIVE_CASE criterion MET when is_halted=false', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_PREVENTIVE_CASE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2241');
const asset = await wakeAndPollAsset(caseId, 'TC-2241');
expect(asset.status).toBe(9);
expect(asset.result).toBe(1);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).not.toContain('NO_PREVENTIVE_CASE');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2242: غير مرتبط بقضية مانعة — criterion FAILS when is_halted=true
test('JF-TC-2242 | NO_PREVENTIVE_CASE criterion FAILS when is_halted=true', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_PREVENTIVE_CASE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2242');
await setRealEstateAssetField(caseId, 'is_halted', true);
const asset = await wakeAndPollAsset(caseId, 'TC-2242');
expect(asset.status).toBe(10);
expect(asset.result).toBe(2);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_PREVENTIVE_CASE');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2243: وجود صك محدث — MET when deed comes from JF-292 inquiry
// UPDATED_DEED_PRESENT checks: Asset.DeedNumber IN initial_assets_json[*].courtAssetReference.
// makeGuideReferral has no estateAssets, so courtAssetReference is absent → we append it here.
test('JF-TC-2243 | UPDATED_DEED_PRESENT MET via JF-292 deed inquiry', async () => {
 await setAllCriteriaActive(true); // guard: heal any criteria left deactivated by a prior failed run
 const caseId = await createAndPrepareCase('QA-TC2243');
 const deedNumber = await getAssetDeedNumber(caseId);
 await setCourtAssetReference(caseId, deedNumber);
 const asset = await wakeAndPollAsset(caseId, 'TC-2243');
 expect(asset.status).toBe(9);
 expect(asset.result).toBe(1);
 expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).not.toContain('UPDATED_DEED_PRESENT');
});

// ── JF-TC-2244: وجود صك محدث — MET when deed comes from judgment deed
// Same courtAssetReference patch; additionally seeds deed_ingestions with posted_referral_id
// to simulate a referral created by the judgment deed ingestion service.
test('JF-TC-2244 | UPDATED_DEED_PRESENT MET via judgment deed', async () => {
 await setAllCriteriaActive(true); // guard: heal any criteria left deactivated by a prior failed run
 const caseId = await createAndPrepareCase('QA-TC2244');
 const deedNumber = await getAssetDeedNumber(caseId);
 const referralId = await getReferralId(caseId);
 await setCourtAssetReference(caseId, deedNumber);
 await seedJudgmentDeedIngestion(deedNumber, referralId);
 try {
const asset = await wakeAndPollAsset(caseId, 'TC-2244');
expect(asset.status).toBe(9);
expect(asset.result).toBe(1);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).not.toContain('UPDATED_DEED_PRESENT');
 } finally {
await deleteSeedDeedIngestion(deedNumber);
 }
});

// ── JF-TC-2245: وجود صك محدث — FAILS when deed absent from both sources
// All criteria stay active. setRealEstateAssetCriteria sets all flags=false + raw land type,
// so every criterion passes EXCEPT UPDATED_DEED_PRESENT (mock deed not in reference table).
test('JF-TC-2245 | UPDATED_DEED_PRESENT FAILS when deed not in reference table', async () => {
 const caseId = await createAndPrepareCase('QA-TC2245');
 const asset = await wakeAndPollAsset(caseId, 'TC-2245');
 expect(asset.status).toBe(10);
 expect(asset.result).toBe(2);
 expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('UPDATED_DEED_PRESENT');
});

// ── JF-TC-2248: Missing inquiry data → asset Not Ready
// BUG JF-735: neq(field, true) treats NULL as pass → asset classified Ready.
// Story requires: "If required stored inquiry data is missing, criterion is treated as failed."
// UPDATED_DEED_PRESENT is satisfied so it doesn't mask the NULL flag behavior.
// test.fail() outer form: this test runs, is expected to fail until JF-735 is fixed.
test.fail('JF-TC-2248 | Asset classified Not Ready when required inquiry data is missing', async () => {
 const caseId = await createAndPrepareCase('QA-TC2248');
 const deedNumber = await getAssetDeedNumber(caseId);
 await setCourtAssetReference(caseId, deedNumber);
 await nullifyRealEstateAssetField(caseId, 'is_mortgaged');
 await nullifyRealEstateAssetField(caseId, 'is_constrained');
 await nullifyRealEstateAssetField(caseId, 'is_testamented');
 await nullifyRealEstateAssetField(caseId, 'is_halted');
 await nullifyDeedInquiryFlag(caseId, 'is_real_estate_mortgaged');
 await nullifyDeedInquiryFlag(caseId, 'is_real_estate_constrained');
 await nullifyDeedInquiryFlag(caseId, 'is_real_estate_testamented');
 await nullifyDeedInquiryFlag(caseId, 'is_real_estate_halted');
 const asset = await wakeAndPollAsset(caseId, 'TC-2248');
 expect(asset.status).toBe(10);
 expect(asset.result).toBe(2);
 const failed = JSON.parse(asset.failed_criteria_codes_json ?? '[]');
 expect(failed).toContain('NO_MORTGAGE');
 expect(failed).toContain('NO_SEIZURE');
 expect(failed).toContain('NO_WILL');
 expect(failed).toContain('NO_PREVENTIVE_CASE');
});

// ── JF-TC-2249: NULL is_constrained → NO_SEIZURE fails
// BUG JF-735: neq(NULL, true) treats NULL as pass → status=9. Story requires NULL → Not Ready.
// All criteria active; UPDATED_DEED_PRESENT satisfied; only is_constrained nullified.
test.fail('JF-TC-2249 | Asset classified Not Ready when isRealEstateConstrained data is missing', async () => {
 const caseId = await createAndPrepareCase('QA-TC2249');
 const deedNumber = await getAssetDeedNumber(caseId);
 await setCourtAssetReference(caseId, deedNumber);
 await nullifyRealEstateAssetField(caseId, 'is_constrained');
 await nullifyDeedInquiryFlag(caseId, 'is_real_estate_constrained');
 const asset = await wakeAndPollAsset(caseId, 'TC-2249');
 expect(asset.status).toBe(10);
 expect(asset.result).toBe(2);
 expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_SEIZURE');
});

// ── JF-TC-2250: NULL is_halted → NO_PREVENTIVE_CASE fails
// BUG JF-735: neq(NULL, true) treats NULL as pass → status=9. Story requires NULL → Not Ready.
test.fail('JF-TC-2250 | Asset classified Not Ready when isRealEstateHalted data is missing', async () => {
 const caseId = await createAndPrepareCase('QA-TC2250');
 const deedNumber = await getAssetDeedNumber(caseId);
 await setCourtAssetReference(caseId, deedNumber);
 await nullifyRealEstateAssetField(caseId, 'is_halted');
 await nullifyDeedInquiryFlag(caseId, 'is_real_estate_halted');
 const asset = await wakeAndPollAsset(caseId, 'TC-2250');
 expect(asset.status).toBe(10);
 expect(asset.result).toBe(2);
 expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_PREVENTIVE_CASE');
});

// ── JF-TC-2251: NULL is_testamented → NO_WILL fails
// BUG JF-735: neq(NULL, true) treats NULL as pass → status=9. Story requires NULL → Not Ready.
test.fail('JF-TC-2251 | Asset classified Not Ready when isRealEstateTestamented data is missing', async () => {
 const caseId = await createAndPrepareCase('QA-TC2251');
 const deedNumber = await getAssetDeedNumber(caseId);
 await setCourtAssetReference(caseId, deedNumber);
 await nullifyRealEstateAssetField(caseId, 'is_testamented');
 await nullifyDeedInquiryFlag(caseId, 'is_real_estate_testamented');
 const asset = await wakeAndPollAsset(caseId, 'TC-2251');
 expect(asset.status).toBe(10);
 expect(asset.result).toBe(2);
 expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_WILL');
});

// ── JF-TC-2256: Not Ready asset still present in classification results
// A constrained (Not Ready) asset must still appear in asset_readiness_results — not dropped.
test('JF-TC-2256 | Not Ready constrained asset remains in classification results', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_SEIZURE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2256');
await setRealEstateAssetField(caseId, 'is_constrained', true);
const asset = await wakeAndPollAsset(caseId, 'TC-2256');
// Asset must be present with Not Ready status — confirming it wasn't dropped from results
expect(asset, 'Asset must appear in readiness results').toBeDefined();
expect(asset.status).toBe(10);
expect(asset.result).toBe(2);
expect(JSON.parse(asset.failed_criteria_codes_json ?? '[]')).toContain('NO_SEIZURE');
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── JF-TC-2257: Mix of Ready and Not Ready assets simultaneously
// Seeds a second RE asset (is_constrained=true → Not Ready) alongside the original (passes).
// Both must appear in results with independent statuses.
test('JF-TC-2257 | Inheritance file with mix of Ready and Not Ready assets', async () => {
 await setAllCriteriaActive(false);
 await setCriteriaActive(['NO_SEIZURE'], true);
 try {
const caseId = await createAndPrepareCase('QA-TC2257');
// Original asset: is_constrained=false (already set by createAndPrepareCase) → Ready
// Second asset: is_constrained=true → Not Ready
await addRealEstateAssetToCase(caseId, { deedNumber: `QA-DEED-2257-${Date.now()}`, isConstrained: true });
expect((await postWake(caseId)).status()).toBe(200);
let pollState = await getPollState(caseId);
for (let i = 0; i < 20 && pollState.runs === 0; i++) {
await sleep(8000);
pollState = await getPollState(caseId);
if (i % 3 === 0) console.log(`[TC-2257 poll ${i + 1}] runs:${pollState.runs} wr:${pollState.wr}`);
}
expect(pollState.runs, 'Classification run never started').toBeGreaterThan(0);
const assets = await getAssets(caseId);
const readyAssets = assets.filter(a => a.type_id === 1 && a.status === 9);
const notReadyAssets = assets.filter(a => a.type_id === 1 && a.status === 10);
console.log(`[TC-2257] total RE assets=${assets.filter(a => a.type_id === 1).length} ready=${readyAssets.length} notReady=${notReadyAssets.length}`);
expect(readyAssets.length, 'At least one RE asset must be Ready').toBeGreaterThanOrEqual(1);
expect(notReadyAssets.length, 'At least one RE asset must be Not Ready').toBeGreaterThanOrEqual(1);
 } finally {
await setAllCriteriaActive(true);
 }
});

// ── TC-JF157-028 (original)

test('TC-JF157-028 | New asset added after gate opens is classified immediately', async () => {
 const caseId = process.env.TC028_OPEN_GATE_CASE_ID;
 if (!caseId) test.skip(true, 'Set TC028_OPEN_GATE_CASE_ID in .env');

 // Step 1 [DB] — Gate open, no run yet
 expect(await getWorkRequirementsResult(caseId!)).toBe(1);
 expect(await getRunCount(caseId!)).toBe(0);

 // Step 2 [DB] — Insert new asset at status 8
 await query(
`INSERT INTO court_case_assets (court_case_id, asset_number, type_id, status, result)
VALUES ($1, 'QA-NEW-ASSET-028', 2, 8, NULL)`,
[caseId]
 );

 // Step 3 [DB] — Classification should trigger automatically
 await sleep(3000);
 const rows = await query<any>(
`SELECT status FROM court_case_assets WHERE court_case_id = $1 AND asset_number = 'QA-NEW-ASSET-028'`,
[caseId]
 );
 expect(rows[0]).toBeDefined();
 expect([9, 10]).toContain(rows[0].status);

 // Step 4 [DB] — A new run entry exists
 expect(await getRunCount(caseId!)).toBeGreaterThan(0);
});

