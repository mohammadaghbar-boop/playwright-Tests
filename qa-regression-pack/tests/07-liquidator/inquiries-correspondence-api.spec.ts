import { test, expect, request as pwRequest } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';
import { URLS, TENANT_ID } from '../../src/helpers/users';

/**
 * Inquiries (tickets) & external-correspondence — API-first, read-only.
 * Covers the inquiries list (JF-891/892/895) and the RBAC boundary on both the
 * inquiries and correspondence-setup surfaces.
 *
 * Verified contract (CIT 2026-07-16, EstateManager session):
 *   GET /cases/api/v1/tickets?pageNumber=1&pageSize=10&Direction=2  -> 200 (outgoing)
 *     Direction is REQUIRED (1=incoming/وارد, 2=outgoing/صادر); omitting it -> 400.
 *   GET /cases/api/v1/correspondence-setup/entities                 -> 403 for EstateManager
 *     (admin/liquidator-scoped) — a protected surface, so EM must NOT read it.
 *   Anonymous requests to both -> 401/403.
 *
 * The liquidator-authenticated UI is untestable on CIT right now (demo liquidator
 * has no user record — see TEST-CYCLE-REPORT env-gaps); these run on the
 * EstateManager session, which is enough to exercise the list + RBAC contract.
 */
test.describe('Inquiries & correspondence (API)', () => {
  let session: ApiSession;

  test.beforeAll(async () => {
    session = await apiLogin();
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test('@high inquiries list responds with the required Direction filter', async () => {
    const res = await apiGet(session, '/cases/api/v1/tickets?pageNumber=1&pageSize=10&Direction=2');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.isSuccess).toBeTruthy();
    expect(Array.isArray(body?.data?.items)).toBeTruthy();
  });

  test('@medium inquiries list enforces the Direction param (400 when omitted)', async () => {
    const res = await apiGet(session, '/cases/api/v1/tickets?pageNumber=1&pageSize=10');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body?.errorCode).toBe('BAD_REQUEST');
  });

  test('@high RBAC: correspondence-setup is protected (EstateManager denied)', async () => {
    // Admin/liquidator-scoped surface — the estate-manager role must not read it.
    const res = await apiGet(session, '/cases/api/v1/correspondence-setup/entities');
    expect(res.status()).toBe(403);
  });

  test('@high RBAC: inquiries and correspondence reject anonymous (401/403)', async () => {
    const anon = await pwRequest.newContext({ ignoreHTTPSErrors: true });
    const headers = { TenantIdentifier: TENANT_ID, 'Accept-Language': 'ar-SA' };
    const paths = [
      '/cases/api/v1/tickets?pageNumber=1&pageSize=10&Direction=2',
      '/cases/api/v1/correspondence-setup/entities',
    ];
    for (const p of paths) {
      const res = await anon.get(`${URLS.api}${p}`, { headers });
      expect([401, 403], `${p} must reject anonymous`).toContain(res.status());
    }
    await anon.dispose();
  });
});
