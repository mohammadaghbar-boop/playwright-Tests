import { test, expect } from '@playwright/test';
import { step, apiContext } from '../src/journey';
import { URLS, TENANT_ID, FIXTURES } from '../src/world';

/**
 * JOURNEY — "A citizen verifies a correspondence letter they received"
 * Persona: Public visitor (no account).
 *
 * Real flow: someone receives an official Joint-Funds letter, scans its QR / opens the
 * public verification page, and checks the letter is authentic by entering the letter
 * number + the deceased's national ID. This is the only fully-anonymous journey.
 */
test.describe('Journey: Public — verify a correspondence letter', () => {
  test('a visitor checks whether a letter is authentic', async () => {
    const api = await apiContext();
    const VERIFY = `${URLS.api}/cases/api/v1/letter-verifications`;
    const headers = { TenantIdentifier: TENANT_ID, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA' };

    await step('The visitor tries a letter number that does not exist → politely rejected', async () => {
      const res = await api.post(VERIFY, { headers, data: { letterNo: 'MK-000-0', deceasedNationalId: '1000000000' } });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.isSuccess).toBe(false);
      expect(body.errorCode).toBe('LETTER_VERIFICATION_FAILED');
      // The rejection must not leak whether the letter or the person exists.
      expect(JSON.stringify(body)).not.toContain('1000000000');
    });

    await step('The visitor forgets a field → the service asks for both', async () => {
      for (const payload of [{}, { letterNo: FIXTURES.letterNo }, { deceasedNationalId: '1000000000' }]) {
        const res = await api.post(VERIFY, { headers, data: payload });
        expect(res.ok(), `partial payload ${JSON.stringify(payload)} must be rejected`).toBeFalsy();
      }
    });

    await step('A prankster pastes an injection string → handled safely, no 500', async () => {
      const res = await api.post(VERIFY, {
        headers,
        data: { letterNo: `MK-16-1' OR '1'='1`, deceasedNationalId: '1000000000' },
      });
      expect([400, 422]).toContain(res.status());
    });

    await api.dispose();
  });
});
