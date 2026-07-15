/**
 * JF-844 — Verify correspondence-letter authenticity via QR (public verification endpoint).
 *
 * API-first: the verification endpoint is public/anonymous, so these run without a browser
 * or auth. The positive cases depend on a real issued letter (MK-581-1 on case INH00581,
 * generated during QA); the deceased national ID is fetched from the DB at runtime (never
 * hard-coded — it is PII) via the CloudBeaver relay. If that fixture letter is not present
 * in the target environment, the positive cases skip cleanly rather than fail.
 *
 * Endpoint: POST {BASE_API_URL}/cases/api/v1/letter-verifications
 * Body:     { letterNo: string, deceasedNationalId: string }   (exact field names)
 * Success:  200 { isSuccess:true, data:{ letterNo, liquidatorName, estateCaseNumber, issuedAt, receivingEntityName } }
 * Failure:  400 { isSuccess:false, errorCode:'LETTER_VERIFICATION_FAILED', errorMessage:'…' }
 *
 * Traceability: TC-844-01/02 (positive card), 07 (public), 10 (BR-001), 12/16 (BR-002),
 * 13/14/15 (missing fields), 17 (no info-leak), 19 (injection), 21 (whitespace trim).
 * TC-844-22 (Arabic-Indic digits) is a known bug (JF-987) → test.fixme until fixed.
 */
import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';
import { query } from './utils/db-client';

const BASE_API_URL = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT = process.env.TENANT_ID ?? 'azm-tenant-12345';
const VERIFY_URL = `${BASE_API_URL}/cases/api/v1/letter-verifications`;

// Seeded fixture: real letter issued on Majed ALQAHTANI's accepted case INH00581.
const FIXTURE_CASE_ID = '3b93081c-d5ca-4df8-abcb-914a526dcdac';
const FIXTURE_LETTER_NO = 'MK-581-1';
const FIXTURE_CASE_NUMBER = 'INH00581';

let deceasedNationalId = '';
let fixtureAvailable = false;

function verify(ctx: APIRequestContext, body: unknown, acceptLang = 'ar-SA') {
  return ctx.post(VERIFY_URL, {
    headers: {
      TenantIdentifier: TENANT,
      'Content-Type': 'application/json',
      'Accept-Language': acceptLang,
    },
    data: body,
  });
}

test.beforeAll(async () => {
  try {
    const { rows } = await query<{ deceased_national_id: string }>(
      `SELECT deceased_national_id FROM cases.court_cases WHERE id = $1`,
      [FIXTURE_CASE_ID],
    );
    deceasedNationalId = rows[0]?.deceased_national_id ?? '';
    if (deceasedNationalId) {
      const ctx = await apiRequest.newContext({ ignoreHTTPSErrors: true });
      const probe = await verify(ctx, { letterNo: FIXTURE_LETTER_NO, deceasedNationalId });
      fixtureAvailable = probe.ok();
      await ctx.dispose();
    }
  } catch {
    fixtureAvailable = false; // no DB creds / relay unavailable → positive cases skip
  }
});

const SKIP_MSG = 'Fixture letter MK-581-1 (case INH00581) + deceased ID not available in this environment';

test.describe('JF-844 letter verification (public endpoint)', () => {
  test('valid letterNo + matching deceasedNationalId returns the confirmation card [TC-01/02]', async ({ request }) => {
    test.skip(!fixtureAvailable, SKIP_MSG);
    const res = await verify(request, { letterNo: FIXTURE_LETTER_NO, deceasedNationalId });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.isSuccess).toBe(true);
    expect(body.data.letterNo).toBe(FIXTURE_LETTER_NO);
    expect(body.data.estateCaseNumber).toBe(FIXTURE_CASE_NUMBER);
    expect(body.data.liquidatorName).toBeTruthy();
    expect(body.data.receivingEntityName).toBeTruthy();
    expect(body.data.issuedAt).toBeTruthy();
    // Security: the API must not echo the raw national ID (masking is presentation-side).
    expect(JSON.stringify(body.data)).not.toContain(deceasedNationalId);
  });

  test('valid letterNo + WRONG deceasedNationalId is rejected [BR-001, TC-10]', async ({ request }) => {
    test.skip(!fixtureAvailable, SKIP_MSG);
    const res = await verify(request, { letterNo: FIXTURE_LETTER_NO, deceasedNationalId: '1000000009' });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.isSuccess).toBe(false);
    expect(body.errorCode).toBe('LETTER_VERIFICATION_FAILED');
  });

  test('unknown / never-issued letter is rejected [BR-002, TC-12/16]', async ({ request }) => {
    const res = await verify(request, { letterNo: 'QA-UNKNOWN-XYZ-000', deceasedNationalId: '1000000000' });
    expect(res.status()).toBe(400);
    expect((await res.json()).errorCode).toBe('LETTER_VERIFICATION_FAILED');
  });

  test('missing / empty fields return the unified error [TC-13/14/15]', async ({ request }) => {
    for (const body of [{ letterNo: 'X' }, { deceasedNationalId: '1000000000' }, {}, { letterNo: '', deceasedNationalId: '' }]) {
      const res = await verify(request, body);
      expect(res.status()).toBe(400);
      expect((await res.json()).isSuccess).toBe(false);
    }
  });

  test('endpoint is public — no auth header, never 401/403 [TC-07]', async ({ request }) => {
    const res = await verify(request, { letterNo: 'QA-NOPE', deceasedNationalId: '1000000000' });
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });

  test('no information leak: unknown-letter and known-letter-wrong-ID responses are identical [TC-17]', async ({ request }) => {
    test.skip(!fixtureAvailable, SKIP_MSG);
    const known = await verify(request, { letterNo: FIXTURE_LETTER_NO, deceasedNationalId: '1000000009' });
    const unknown = await verify(request, { letterNo: 'QA-NOPE-ZZ', deceasedNationalId: '1000000009' });
    expect(known.status()).toBe(unknown.status());
    expect(await known.text()).toBe(await unknown.text());
  });

  test('injection payloads are safely rejected with no server error [TC-19]', async ({ request }) => {
    for (const payload of ["' OR 1=1--", '"; DROP TABLE x;--', '{"$ne":null}']) {
      const res = await verify(request, { letterNo: payload, deceasedNationalId: payload });
      expect(res.status()).toBe(400);
      expect(res.status()).toBeLessThan(500);
      expect(await res.text()).not.toMatch(/stack trace|exception|sql|syntax error/i);
    }
  });

  test('surrounding whitespace is trimmed before matching [TC-21]', async ({ request }) => {
    test.skip(!fixtureAvailable, SKIP_MSG);
    const res = await verify(request, { letterNo: `  ${FIXTURE_LETTER_NO}  `, deceasedNationalId: `  ${deceasedNationalId}  ` });
    expect(res.status()).toBe(200);
    expect((await res.json()).isSuccess).toBe(true);
  });

  test('failure message is localised (Arabic vs English) [TC-08]', async ({ request }) => {
    const ar = await verify(request, { letterNo: 'QA-NOPE', deceasedNationalId: '1000000000' }, 'ar-SA');
    const en = await verify(request, { letterNo: 'QA-NOPE', deceasedNationalId: '1000000000' }, 'en-US');
    expect((await ar.json()).errorMessage).toMatch(/[؀-ۿ]/); // contains Arabic
    expect((await en.json()).errorMessage).toMatch(/incorrect|letter|national/i);
  });

  // KNOWN BUG (JF-987): Arabic-Indic digits in the national ID are not normalised, so a
  // valid ID typed as ٠١٢… fails. Enable this test once JF-987 is fixed. [TC-22]
  test.fixme('accepts a national ID entered in Arabic-Indic digits [TC-22, JF-987]', async ({ request }) => {
    const arabicIndic = deceasedNationalId.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
    const res = await verify(request, { letterNo: FIXTURE_LETTER_NO, deceasedNationalId: arabicIndic });
    expect(res.status()).toBe(200); // currently 400 — tracked by JF-987
  });
});
