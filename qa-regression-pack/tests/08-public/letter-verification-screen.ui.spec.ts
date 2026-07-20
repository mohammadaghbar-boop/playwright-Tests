import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * 08-public — FRONTEND (UI) probe for a public letter-verification PAGE.
 *
 * FINDING (CIT 2026-07-20): there is NO anonymous letter-verification UI page. Every
 * candidate route (/letter-verification, /letter-verifications, /verify-letter, /verify,
 * /public/letter-verification, /letters/verify) redirects an unauthenticated visitor to
 * /login (the SP login screen). Letter verification is therefore delivered as a
 * BACKEND API only — the QR on a physical letter is expected to resolve server-side.
 *
 * This spec asserts that honest current state (no public UI page today) and keeps the
 * behavioural contract covered where it actually lives — the public API — cross-checked
 * here and fully exercised in letter-verification.spec.ts (JF-844) alongside it.
 *
 * `public` project → no auth / no storageState.
 */

const BASE_API_URL = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT = process.env.TENANT_ID ?? 'azm-tenant-12345';
const VERIFY_URL = `${BASE_API_URL}/cases/api/v1/letter-verifications`;

const CANDIDATE_ROUTES = [
  '/letter-verification',
  '/letter-verifications',
  '/verify-letter',
  '/verify',
  '/public/letter-verification',
  '/letters/verify',
];

function verify(ctx: APIRequestContext, body: unknown) {
  return ctx.post(VERIFY_URL, {
    headers: { TenantIdentifier: TENANT, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA' },
    data: body,
  });
}

test.describe('08-public — letter-verification UI probe', () => {
  test('@medium no anonymous letter-verification UI page exists (routes redirect to /login)', async ({ page }) => {
    // If a real public verification page is ever shipped, one of these routes will stop
    // redirecting to /login and this spec should be upgraded to drive its form
    // (letter no + deceased NID → result card / rejection). Today it documents its absence.
    const landings: string[] = [];
    for (const route of CANDIDATE_ROUTES) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // The Angular auth guard redirects an anonymous visitor to /login CLIENT-SIDE, after
      // domcontentloaded — wait for that redirect rather than racing it.
      const redirected = await page
        .waitForURL(/\/login(\b|$)|nafath-login/, { timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      landings.push(`${route} → ${new URL(page.url()).pathname}`);
      // No public verification form is served: the anonymous visitor is sent to login.
      expect(
        redirected,
        `route ${route} unexpectedly did NOT redirect to login (landed on ${page.url()}) — a public UI page may now exist; upgrade this spec to drive it`,
      ).toBeTruthy();
    }
    test.info().annotations.push({ type: 'observed', description: `letter-verification UI routes: ${landings.join(' | ')}` });
  });

  test('@high the verification contract is served by the public API (letter no + deceased NID)', async ({ request }) => {
    // The behaviour a public page WOULD drive lives on the API — assert the rejection card
    // contract here so the public-facing capability stays covered end to end.
    const res = await verify(request, { letterNo: 'MK-000-0', deceasedNationalId: '1000000000' });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.isSuccess).toBe(false);
    expect(body.errorCode).toBe('LETTER_VERIFICATION_FAILED');
    // The rejection must not leak whether the letter or the person exists.
    expect(JSON.stringify(body)).not.toContain('1000000000');
  });
});
