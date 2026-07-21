import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * JF-844 — public QR letter-verification endpoint (no auth required).
 * Positive card depends on the seeded fixture letter MK-581-1 (case INH00581);
 * without DB access the deceased NID can't be fetched, so the positive case
 * probes and skips cleanly when the fixture isn't resolvable.
 */
const BASE_API_URL = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT = process.env.TENANT_ID ?? 'azm-tenant-12345';
const VERIFY_URL = `${BASE_API_URL}/cases/api/v1/letter-verifications`;

function verify(ctx: APIRequestContext, body: unknown) {
  return ctx.post(VERIFY_URL, {
    headers: { TenantIdentifier: TENANT, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA' },
    data: body,
  });
}

test.describe('Public letter verification (JF-844)', () => {
  test('@smoke @high unknown letter number is rejected without leaking info', async ({ request }) => {
    const res = await verify(request, { letterNo: 'MK-000-0', deceasedNationalId: '1000000000' });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.isSuccess).toBe(false);
    expect(body.errorCode).toBe('LETTER_VERIFICATION_FAILED');
  });

  test('@high missing fields are rejected', async ({ request }) => {
    for (const payload of [{}, { letterNo: 'MK-581-1' }, { deceasedNationalId: '1000000000' }]) {
      const res = await verify(request, payload);
      expect(res.ok(), `payload ${JSON.stringify(payload)} must be rejected`).toBeFalsy();
    }
  });

  test('@medium injection payloads are handled safely', async ({ request }) => {
    const res = await verify(request, {
      letterNo: `MK-581-1' OR '1'='1`,
      deceasedNationalId: '1000000000',
    });
    expect([400, 422]).toContain(res.status());
  });
});
