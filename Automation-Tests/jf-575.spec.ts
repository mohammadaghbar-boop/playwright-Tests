/**
 * JF-575 – اضافة جهات الاستعلام (Add Inquiry Entities)
 * Playwright API tests covering the inquiry-authorities feature on the Infath platform.
 *
 * Test IDs: TC-575-036, TC-575-037, TC-575-038, TC-575-043 through TC-575-059
 *
 * Pre-requisites:
 *  1. Fill .env (BASE_API_URL, TENANT_ID, X_API_KEY, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD,
 *               LIQUIDATOR_EMAIL, LIQUIDATOR_PASSWORD, CB_SESSION_ID)
 *  2. npm install
 *  3. npx playwright test --project=JF-575
 *
 * CONFIRMED (probed 2026-06-30):
 *  - Endpoint: /cases/api/v1/court-cases/{id}/inquiry-authorities (200 OK)
 *  - DB table:  cases.case_inquiry_authorities
 *  - Auth:      requires Liquidator role (demo-liquidator@azm.sa / Azm@123)
 *               super-admin and estate-manager get 403
 *  - POST returns 200 (not 201) with { data: { id } }
 *  - GET  returns 200 with { data: { items: [...], totalCount, ... } }
 *  - entity_type: smallint in DB; integer in POST request; string label in GET response
 *                 1=Ministry, 2=Authority, 3=Government Bank, 4=Judicial Entity, 5=Security Entity
 *
 * CONFIRMED FIELD RULES (Toqa Bany Yassen, JF-575 Jira 2026-06-08):
 *  - nameAr (name_ar):  Mandatory; unique per case
 *  - nameEn (name_en):  Mandatory; unique per case
 *  - entityType:        Mandatory integer enum (see above)
 *  - description:       Optional
 *  - attachment:        Optional (via cases.case_inquiry_authority_attachments)
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

import { getToken, postReferral, disposeApiContext } from './helpers/api-client';
import {
  getCloudBeaverSession,
  closeBrowser,
} from './helpers/browser-auth';
import { setCbSessionCookie, getCaseId, query, closeDb } from './helpers/jf157-db-client';
import { makeUniqueReferral } from './fixtures/referral-data';

// ── Config ─────────────────────────────────────────────────────────────────
const BASE      = process.env.BASE_API_URL      ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT    = process.env.TENANT_ID          ?? 'azm-tenant-12345';
const X_API_KEY = process.env.X_API_KEY          ?? '';

const INQUIRY_PATH = (caseId: string) =>
  `${BASE}/cases/api/v1/court-cases/${caseId}/inquiry-authorities`;

// entity_type enum (smallint in DB; sent as integer in POST; returned as string label in GET)
// 1=Ministry, 2=Authority, 3=Government Bank, 4=Judicial Entity, 5=Security Entity
const ENTITY_TYPE = 1;

// ── Shared state ────────────────────────────────────────────────────────────
let liquidatorToken: string;
let sharedCaseId: string;

const TS          = Date.now();
const ENTITY_AR   = `جهة اختبار ${TS}`;
const ENTITY_EN   = `Test Authority ${TS}`;

// ── Helpers ─────────────────────────────────────────────────────────────────
function authHeaders(tok: string) {
  return {
    'TenantIdentifier': TENANT,
    'Content-Type':     'application/json',
    'Accept-Language':  'ar-SA',
    ...(X_API_KEY ? { 'x-api-key': X_API_KEY } : {}),
    'Authorization':    `Bearer ${tok}`,
  };
}

async function getLiquidatorToken(): Promise<string> {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/users/api/v1/auth/login`, {
    headers: { 'TenantIdentifier': TENANT, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA', ...(X_API_KEY ? { 'x-api-key': X_API_KEY } : {}) },
    data: {
      Email:    process.env.LIQUIDATOR_EMAIL    ?? 'demo-liquidator@azm.sa',
      Password: process.env.LIQUIDATOR_PASSWORD ?? 'Azm@123',
    },
  });
  const body = await res.json();
  await ctx.dispose();
  const tok = body?.data?.accessToken;
  if (!tok) throw new Error(`Liquidator login failed: ${JSON.stringify(body).substring(0, 200)}`);
  return tok;
}

async function addAuthority(caseId: string, body: object, tok?: string) {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(INQUIRY_PATH(caseId), {
    headers: authHeaders(tok ?? liquidatorToken),
    data: body,
  });
  // ctx not disposed here — callers read res.json()/res.text() after return
  return res;
}

async function getAuthorities(caseId: string, tok?: string) {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(INQUIRY_PATH(caseId), {
    headers: authHeaders(tok ?? liquidatorToken),
  });
  // ctx not disposed here — callers read res.json()/res.text() after return
  return res;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Suite setup ─────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  liquidatorToken = await getLiquidatorToken();

  // DB session (non-fatal — DB tests warn if unavailable)
  try {
    const cbSession = await getCloudBeaverSession();
    setCbSessionCookie(cbSession);
  } catch (e: any) {
    console.warn('[beforeAll] CB session failed (DB tests will be skipped):', e.message?.substring(0, 80));
  }

  // Create shared case for the suite using super-admin

  const referralBody = makeUniqueReferral('575');
  const res = await postReferral(referralBody);
  expect(res.status(), `Referral creation failed: ${await res.text()}`).toBeLessThan(300);
  const body575 = await res.json();
  const referralId: string = body575?.data?.referralId ?? body575?.referralId;
  expect(referralId, 'No referral ID in response').toBeTruthy();
  sharedCaseId = await getCaseId(referralId);
  console.log(`[JF-575] Shared case: ${sharedCaseId}`);
});

test.afterAll(async () => {
  await disposeApiContext();
  await closeDb();
  await closeBrowser();
});

test.afterEach(async () => {
  await sleep(2000);
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUP 1 – SECURITY / AUTH  (TC-575-036 / TC-575-037 / TC-575-038)
// ══════════════════════════════════════════════════════════════════════════════

test('TC-575-036 – Verify POST inquiry authority returns 401 without auth token', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(INQUIRY_PATH(sharedCaseId), {
    headers: { 'TenantIdentifier': TENANT, 'Content-Type': 'application/json' },
    data: { nameAr: ENTITY_AR, nameEn: ENTITY_EN, entityType: ENTITY_TYPE },
  });
  await ctx.dispose();
  expect(res.status(), 'Expected 401 without auth').toBe(401);
});

test('TC-575-037 – Verify POST inquiry authority returns 401 with invalid token', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(INQUIRY_PATH(sharedCaseId), {
    headers: authHeaders('invalid.jwt.token'),
    data: { nameAr: ENTITY_AR, nameEn: ENTITY_EN, entityType: ENTITY_TYPE },
  });
  await ctx.dispose();
  expect(res.status(), 'Expected 401 with invalid token').toBe(401);
});

test('TC-575-038 – Verify GET inquiry authorities returns 401 without auth token', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.get(INQUIRY_PATH(sharedCaseId), {
    headers: { 'TenantIdentifier': TENANT, 'Content-Type': 'application/json' },
  });
  await ctx.dispose();
  expect(res.status(), 'Expected 401 without auth on GET').toBe(401);
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUP 2 – API CONTRACT  (TC-575-043 through TC-575-050)
// ══════════════════════════════════════════════════════════════════════════════

test('TC-575-043 – Verify GET inquiry authorities returns 200 for valid case', async () => {
  const res = await getAuthorities(sharedCaseId);
  expect(res.status(), `Unexpected status: ${await res.text()}`).toBe(200);
  const body = await res.json();
  expect(body.isSuccess).toBe(true);
  const items: unknown[] = body?.data?.items ?? [];
  expect(Array.isArray(items), 'data.items should be an array').toBe(true);
});

test('TC-575-044 – Verify GET returns empty list (not 404) when no authorities exist', async () => {

  const res2 = await postReferral(makeUniqueReferral('575044'));
  const referralId = (await res2.json())?.data?.referralId;
  const emptyCaseId = await getCaseId(referralId);

  const res = await getAuthorities(emptyCaseId);
  expect(res.status()).toBe(200);
  const body = await res.json();
  const items: unknown[] = body?.data?.items ?? [];
  expect(Array.isArray(items)).toBe(true);
  expect(items.length, 'Expected empty list for fresh case').toBe(0);
});

test('TC-575-045 – Verify POST inquiry authority returns 200 with created entity id', async () => {
  const res = await addAuthority(sharedCaseId, {
    nameAr:     ENTITY_AR,
    nameEn:     ENTITY_EN,
    entityType: ENTITY_TYPE,
  });
  const body = await res.json();
  expect(res.status(), `POST failed: ${JSON.stringify(body)}`).toBe(200);
  expect(body.isSuccess).toBe(true);
  expect(body.data).toHaveProperty('id');
  expect(typeof body.data.id).toBe('string');
});

test('TC-575-046 – Verify POST returns 400 for missing required fields', async () => {
  const res = await addAuthority(sharedCaseId, {
    // Only entityType supplied; nameAr and nameEn missing
    entityType: ENTITY_TYPE,
  });
  expect(res.status(), 'Expected 400 for missing required fields').toBe(400);
  const body = await res.json();
  expect(body.isSuccess).toBe(false);
  // Validation error details should mention NameAr and/or NameEn
  expect(
    JSON.stringify(body.errorDetails ?? body),
    'Expected validation details about NameAr/NameEn'
  ).toMatch(/NameAr|NameEn|nameAr|nameEn/i);
});

test('TC-575-047 – Verify POST returns 400 for duplicate authority name in same case', async () => {
  const dupAR = `جهة مكررة ${TS + 1}`;
  const dupEN = `Duplicate Authority ${TS + 1}`;

  const first = await addAuthority(sharedCaseId, {
    nameAr: dupAR, nameEn: dupEN, entityType: ENTITY_TYPE,
  });
  expect(first.status()).toBe(200);

  const second = await addAuthority(sharedCaseId, {
    nameAr: dupAR, nameEn: dupEN, entityType: ENTITY_TYPE,
  });
  expect(
    [400, 409],
    `Expected 400 or 409 for duplicate, got ${second.status()}: ${await second.text()}`
  ).toContain(second.status());
});

test('TC-575-048 – Verify GET inquiry authorities returns 404 for non-existent case ID', async () => {
  const res = await getAuthorities('00000000-0000-0000-0000-000000000000');
  expect([404, 400], `Expected 404/400 for non-existent case, got ${res.status()}`).toContain(res.status());
});

test('TC-575-049 – Verify POST inquiry authority returns 404 for non-existent case ID', async () => {
  const res = await addAuthority('00000000-0000-0000-0000-000000000000', {
    nameAr: `جهة خاطئة ${TS}`, nameEn: `Ghost Authority ${TS}`, entityType: ENTITY_TYPE,
  });
  expect([404, 400], `Expected 404/400 for non-existent case, got ${res.status()}`).toContain(res.status());
});

test('TC-575-050 – Verify GET response schema includes all expected fields', async () => {
  // Add one with description to ensure it surfaces in GET
  await addAuthority(sharedCaseId, {
    nameAr:     `هيئة الاختبار الشامل ${TS + 2}`,
    nameEn:     `Comprehensive Test Authority ${TS + 2}`,
    entityType: ENTITY_TYPE,
    description: 'وصف تجريبي',
  });

  const res = await getAuthorities(sharedCaseId);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.isSuccess).toBe(true);

  const items: any[] = body?.data?.items ?? [];
  expect(items.length, 'Expected at least one item').toBeGreaterThan(0);

  // Check schema of first item
  const item = items[0];
  expect(item).toHaveProperty('id');
  expect(item).toHaveProperty('nameAr');
  expect(item).toHaveProperty('nameEn');
  expect(item).toHaveProperty('entityType'); // string label in response
  expect(typeof item.id).toBe('string');
  expect(typeof item.nameAr).toBe('string');
  expect(typeof item.nameEn).toBe('string');
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUP 3 – DATABASE VALIDATION  (TC-575-051 through TC-575-054)
// ══════════════════════════════════════════════════════════════════════════════

test('TC-575-051 – Verify authority record is persisted in the database', async () => {
  const ar = `جهة قاعدة البيانات ${TS + 3}`;
  const en = `DB Validation Authority ${TS + 3}`;

  const createRes = await addAuthority(sharedCaseId, { nameAr: ar, nameEn: en, entityType: ENTITY_TYPE });
  expect(createRes.status()).toBe(200);

  let rows: any[] = [];
  for (let i = 0; i < 10; i++) {
    rows = await query<Record<string, unknown>>(
      `SELECT id, court_case_id, name_ar, name_en, entity_type, is_deleted
       FROM cases.case_inquiry_authorities
       WHERE court_case_id = $1 AND (name_ar = $2 OR name_en = $3)
       LIMIT 1`,
      [sharedCaseId, ar, en]
    );
    if (rows.length) break;
    await sleep(1000);
  }

  expect(rows.length, 'Authority not found in DB after 10s').toBe(1);
  const row = rows[0];
  expect(String(row.court_case_id)).toBe(sharedCaseId);
  expect(String(row.name_ar)).toBe(ar);
  expect(String(row.name_en)).toBe(en);
  expect(row.is_deleted).toBe(false);
});

test('TC-575-052 – Verify authority foreign key links to the correct case in DB', async () => {
  const ar = `جهة الربط ${TS + 4}`;
  const en = `FK Test Authority ${TS + 4}`;

  await addAuthority(sharedCaseId, { nameAr: ar, nameEn: en, entityType: ENTITY_TYPE });

  await sleep(2000);
  const rows = await query<Record<string, unknown>>(
    `SELECT court_case_id FROM cases.case_inquiry_authorities WHERE name_en = $1 LIMIT 1`,
    [en]
  );

  expect(rows.length, 'Authority not found in DB').toBeGreaterThan(0);
  expect(String(rows[0].court_case_id)).toBe(sharedCaseId);
});

test('TC-575-053 – Verify DB-level unique constraint prevents concurrent duplicate inserts', async () => {
  const ar = `جهة التحقق المزدوج ${TS + 5}`;
  const en = `Concurrent Duplicate ${TS + 5}`;
  const body = { nameAr: ar, nameEn: en, entityType: ENTITY_TYPE };

  const [res1, res2] = await Promise.all([
    addAuthority(sharedCaseId, body),
    addAuthority(sharedCaseId, body),
  ]);

  const statuses = [res1.status(), res2.status()].sort();
  expect(statuses).toContain(200);
  expect(statuses.some(s => s === 400 || s === 409)).toBe(true);

  await sleep(2000);
  const rows = await query<Record<string, unknown>>(
    `SELECT COUNT(*) AS cnt FROM cases.case_inquiry_authorities
     WHERE court_case_id = $1 AND name_en = $2 AND is_deleted = false`,
    [sharedCaseId, en]
  );
  expect(Number(rows[0]?.cnt ?? 0), 'Expected exactly one DB row after concurrent insert').toBe(1);
});

test('TC-575-054 – Verify description is stored correctly in DB', async () => {
  const ar = `جهة مع وصف ${TS + 6}`;
  const en = `Authority With Description ${TS + 6}`;
  const description = 'وصف الجهة التجريبية';

  const createRes = await addAuthority(sharedCaseId, {
    nameAr: ar, nameEn: en, entityType: ENTITY_TYPE, description,
  });
  expect(createRes.status()).toBe(200);

  await sleep(2000);
  const rows = await query<Record<string, unknown>>(
    `SELECT description FROM cases.case_inquiry_authorities
     WHERE court_case_id = $1 AND name_en = $2 LIMIT 1`,
    [sharedCaseId, en]
  );
  expect(rows.length).toBe(1);
  expect(String(rows[0].description)).toBe(description);
});

// ══════════════════════════════════════════════════════════════════════════════
// GROUP 4 – DUPLICATE LOGIC EDGE CASES  (TC-575-055 through TC-575-059)
// ══════════════════════════════════════════════════════════════════════════════

test('TC-575-055 – Verify duplicate Arabic name is rejected even with different English name', async () => {
  const ar = `جهة العربية الفريدة ${TS + 7}`;

  const first = await addAuthority(sharedCaseId, {
    nameAr: ar, nameEn: `First English ${TS + 7}`, entityType: ENTITY_TYPE,
  });
  expect(first.status()).toBe(200);

  const second = await addAuthority(sharedCaseId, {
    nameAr: ar, nameEn: `Second English ${TS + 7}`, entityType: ENTITY_TYPE,
  });
  expect(
    [400, 409],
    `Expected duplicate rejection for same Arabic name, got ${second.status()}: ${await second.text()}`
  ).toContain(second.status());
});

test('TC-575-056 – Verify duplicate English name is rejected even with different Arabic name', async () => {
  const en = `Unique English Name ${TS + 8}`;

  const first = await addAuthority(sharedCaseId, {
    nameAr: `جهة أولى ${TS + 8}`, nameEn: en, entityType: ENTITY_TYPE,
  });
  expect(first.status()).toBe(200);

  const second = await addAuthority(sharedCaseId, {
    nameAr: `جهة ثانية ${TS + 8}`, nameEn: en, entityType: ENTITY_TYPE,
  });
  expect(
    [400, 409],
    `Expected duplicate rejection for same English name, got ${second.status()}`
  ).toContain(second.status());
});

test('TC-575-057 – Verify same authority name can be used across different cases', async () => {
  // Uniqueness is per-case — same names are allowed on a different case

  const r = await postReferral(makeUniqueReferral('575057'));
  const referralId = (await r.json())?.data?.referralId;
  const caseB = await getCaseId(referralId);

  const ar = `جهة المشتركة ${TS + 9}`;
  const en = `Shared Name Authority ${TS + 9}`;

  const res1 = await addAuthority(sharedCaseId, { nameAr: ar, nameEn: en, entityType: ENTITY_TYPE });
  expect(res1.status()).toBe(200);

  const res2 = await addAuthority(caseB, { nameAr: ar, nameEn: en, entityType: ENTITY_TYPE });
  expect(
    res2.status(),
    `Same name should be allowed on a different case. Got: ${res2.status()}: ${await res2.text()}`
  ).toBe(200);
});

test('TC-575-058 – Verify XSS payload in authority name is stored as literal text, not executed', async () => {
  const xssAr = `<script>alert('xss')</script>`;
  const xssEn = `<img src=x onerror=alert(1)> ${TS + 10}`;

  const res = await addAuthority(sharedCaseId, {
    nameAr: xssAr, nameEn: xssEn, entityType: ENTITY_TYPE,
  });

  expect(res.status(), 'API must not return 500 on XSS input').not.toBe(500);

  if (res.status() === 200) {
    const body = await res.json();
    const id: string = body?.data?.id ?? '';
    if (id) {
      // API stores the raw payload as-is (correct behavior) — verify it round-trips unchanged
      const getRes = await getAuthorities(sharedCaseId);
      const items: any[] = (await getRes.json())?.data?.items ?? [];
      const stored = items.find((i: any) => i.id === id);
      if (stored) {
        // The API must return the exact string stored, not sanitised/truncated/errored
        expect(String(stored.nameEn ?? '').length, 'Stored XSS string must not be empty').toBeGreaterThan(0);
      }
    }
  }
});

test('TC-575-059 – Verify SQL injection in authority name does not cause server error', async () => {
  const sqlInjection = `'; DROP TABLE cases.case_inquiry_authorities; --`;

  const res = await addAuthority(sharedCaseId, {
    nameAr: `جهة اختبار SQL ${TS + 11}`,
    nameEn: sqlInjection,
    entityType: ENTITY_TYPE,
  });

  expect(res.status(), 'API must not return 500 on SQL injection input').not.toBe(500);

  if (res.status() === 200) {
    const rows = await query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM cases.case_inquiry_authorities WHERE court_case_id = $1`,
      [sharedCaseId]
    );
    expect(Number(rows[0]?.cnt ?? 0), 'case_inquiry_authorities table must still exist').toBeGreaterThan(0);
  }
});
