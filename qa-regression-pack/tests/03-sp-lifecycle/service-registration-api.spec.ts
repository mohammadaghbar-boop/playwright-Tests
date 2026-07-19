import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';
import { annotateKnownIssue } from '../../src/known-issues';
import { URLS, TENANT_ID } from '../../src/helpers/users';

/**
 * Service-provider lifecycle — API-first, read-only/idempotent.
 * The service-registration wizard (JF-564) loads its config from
 * GET /platform/api/v1/site-config/service-registration; JF-829 is that request
 * aborting (ERR_ABORTED), which blocks step 1. This guards it: a 200 means the
 * blocker is gone. Runs on the SP Nafath session (sp.json).
 *
 * Note: facility/service *creation* (POST /cases/api/v1/companies/registration-requests,
 * .../manual-registration-requests, .../files/upload-chunked) mutates data, so it is
 * exercised only in the one-time test cycle (area-b-results.md), not this repeatable pack.
 */
test.describe('Service registration config (API)', () => {
  let session: ApiSession;

  test.beforeAll(async () => {
    // The site-config endpoint is served under the same API/tenant; a fresh EM
    // token is sufficient to reach it (the SP UI simply fetches it after login).
    session = await apiLogin();
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test('@high service-registration site-config loads (guards JF-829)', async () => {
    annotateKnownIssue(test, 'JF-829');
    const res = await session.ctx.get(`${URLS.api}/platform/api/v1/site-config/service-registration`, {
      headers: { TenantIdentifier: TENANT_ID, 'Accept-Language': 'ar-SA', Authorization: `Bearer ${session.token}` },
    });
    // JF-829: currently aborts / non-200. When fixed this returns the wizard config.
    expect(res.status(), 'site-config for the service wizard must load').toBe(200);
  });
});
