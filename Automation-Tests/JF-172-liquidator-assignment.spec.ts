/**
 * JF-172 — Send Assignment Request to the Liquidator (API regression guard).
 *
 * API-first, read-only. JF-172 assignment fires synchronously right after a fresh
 * classification-save (verified: event 20 -> event 23 sub-second) and the selected
 * liquidator is carried on the estate once accepted. On-demand re-trigger is gated by
 * a fresh classification (JF-171 pipeline), so this guards the persistent, observable
 * OUTCOME: the assignment→accept lifecycle yields estates that carry a liquidator, and
 * the golden assigned estate keeps its selected liquidator.
 *
 * Endpoint: GET /cases/api/v1/court-cases (list item carries liquidatorName + status).
 * Golden fixture: INH00016 (rank-D estate escalated to rank-A liquidator Majed ALQAHTANI,
 * status 11 = «قيد العمل»). Traceability: TC-172-01/05/06/09/11.
 */
import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';

const API = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT = process.env.TENANT_ID ?? 'azm-tenant-12345';
const EM_EMAIL = process.env.ESTATE_MANAGER_EMAIL ?? 'demo-estate-manager@azm.sa';
const EM_PASS = process.env.ESTATE_MANAGER_PASSWORD ?? 'Azm@123';
const GOLDEN_ASSIGNED = 'INH00016';
const STATUS_WORKING = 11; // «قيد العمل» — set once the liquidator has accepted

let ctx: APIRequestContext;
let token = '';

test.beforeAll(async () => {
  ctx = await apiRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${API}/users/api/v1/auth/login`, {
    headers: { TenantIdentifier: TENANT, 'Content-Type': 'application/json' },
    data: { Email: EM_EMAIL, Password: EM_PASS },
  });
  token = (await res.json())?.data?.accessToken ?? '';
});
test.afterAll(async () => { await ctx?.dispose(); });

async function listCases(): Promise<Array<{ fileNumber: string; status: number; liquidatorName: string | null }>> {
  const res = await ctx.get(`${API}/cases/api/v1/court-cases?pageIndex=1&pageSize=50`, {
    headers: { TenantIdentifier: TENANT, Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  return (await res.json())?.data?.items ?? [];
}

test.describe('JF-172 liquidator assignment (API regression guard)', () => {
  test('@high the assignment→accept lifecycle yields at least one estate carrying a liquidator', async () => {
    expect(token, 'EstateManager login failed').toBeTruthy();
    const items = await listCases();
    const assigned = items.filter((i) => i.liquidatorName);
    expect(
      assigned.length,
      'no estate carries a liquidator — the JF-172 assignment lifecycle may be broken',
    ).toBeGreaterThan(0);
  });

  test('@medium golden estate INH00016 keeps its selected liquidator at the working status', async () => {
    expect(token).toBeTruthy();
    const items = await listCases();
    const golden = items.find((i) => i.fileNumber === GOLDEN_ASSIGNED);
    test.skip(!golden, `${GOLDEN_ASSIGNED} not present (environment reseeded)`);
    expect(golden!.liquidatorName, 'assigned liquidator should persist on the estate').toBeTruthy();
    expect(golden!.status, 'accepted estate should be at «قيد العمل»').toBe(STATUS_WORKING);
  });
});
