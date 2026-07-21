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

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCKED ACs — present and ready; run once the blockers are fixed.
  // All need a FRESH pending assignment (a fresh classification triggers the
  // assignment) and/or extra liquidator services — currently blocked by:
  //   JF-717 (SAMA inquiry retry never triggered → no fresh classification)
  //   JF-927 (non-deterministic readiness) / JF-735 (NULL inquiry = PASS)
  // To enable: fix JF-717/JF-927, then (a) build the extra liquidator services
  // below, (b) drive a fresh estate → pending assignment, (c) remove `.fixme`.
  // Env fixtures the enabled tests will read:
  //   JF172_FRESH_UNASSIGNED_ESTATE  — classified, unassigned court-case id
  //   JF172_RANKD_LIQUIDATOR_SVC     — a rank-D liquidator facility_service_id
  //   JF172_SECOND_LIQUIDATOR_SVC    — a 2nd same-rank liquidator facility_service_id
  //   JF172_INACTIVE_LIQUIDATOR_SVC  — an inactive liquidator facility_service_id
  //   JF172_NA_ESTATE                — an estate classified NA / without a valid rank
  //   JF172_TIMED_OUT_ESTATE         — a pending request already aged past 48h
  // ──────────────────────────────────────────────────────────────────────────

  test.fixme('@blocked-JF717 same-rank liquidator is selected before escalation [TC-172-04]', async () => {
    // AC: "first searches for eligible liquidators with the same rank as the inheritance".
    // Setup: rank-D estate + an eligible rank-D liquidator service (JF172_RANKD_LIQUIDATOR_SVC).
    // Trigger assignment; assert the selected request's rank_at_selection == the estate rank (same-rank),
    // i.e. it did NOT escalate to a higher-rank liquidator.
  });

  test.fixme('@blocked-JF717 inactive liquidator accounts are excluded [TC-172-03]', async () => {
    // AC: "excludes inactive liquidator accounts".
    // Setup: an inactive liquidator service (JF172_INACTIVE_LIQUIDATOR_SVC) in the candidate pool.
    // Trigger assignment; assert the inactive liquidator is never the selected liquidator_user_id.
  });

  test.fixme('@blocked-JF717 workload priority selects the lowest (accepted + pending) [TC-172-07]', async () => {
    // AC: "prioritizes the liquidator with the lowest number of currently assigned inheritances".
    // Setup: >=2 eligible same-rank liquidators with different workloads.
    // Trigger assignment; assert the lowest-(accepted+pending)-count liquidator was chosen.
  });

  test.fixme('@blocked-JF717 tie-break selects the next liquidator in the queue [TC-172-08]', async () => {
    // AC: "selects the next liquidator in the queue only when multiple ... same lowest assignment count".
    // Setup: 2 equal-workload same-rank liquidators.
    // Trigger assignment; assert the deterministic next-in-queue liquidator was chosen.
  });

  test.fixme('@blocked-JF927 no assignment starts when the rank is not saved [TC-172-12]', async () => {
    // AC: "does not start the process if the inheritance rank is not saved".
    // Setup: an estate classified NA / without a valid rank (JF172_NA_ESTATE) — needs JF-927 fixed.
    // Assert: no LiquidatorAssignmentRequests row / no event 23 is created for that estate.
  });

  test.fixme('@blocked-JF717 48h no-response triggers reassignment and excludes the non-responder [TC-172-14]', async () => {
    // AC: "automatically starts reassignment after 48 hours if the selected liquidator does not respond".
    // Setup: a pending request aged past 48h (JF172_TIMED_OUT_ESTATE).
    // Run the timeout job; assert reassignment fires and the non-responder is excluded from re-selection.
  });
});
