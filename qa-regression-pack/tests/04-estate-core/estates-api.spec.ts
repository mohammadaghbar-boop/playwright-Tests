import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';

/**
 * Estate backbone — API-first regression. Covers the estates list (JF-22),
 * estate detail + tabs (JF-7/8/9/10), and the inquiry fan-out
 * (JF-243/289/291/292/677). Read-only: it never mutates the database, so it is
 * safe to run against CIT after every deploy. Runs with the EstateManager demo
 * account (the role authorized for the backbone; PD returns 401 here).
 *
 * The duplicate-referral guard (JF-263) is intentionally NOT here — asserting it
 * requires POSTing a duplicate referral, which creates estates; that check lives
 * in the one-time test cycle (area-c-results.md), not the repeatable pack.
 */
test.describe('Estate backbone (API)', () => {
  let session: ApiSession;
  let sampleCaseId: string | undefined;

  test.beforeAll(async () => {
    session = await apiLogin();
  });

  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test('@smoke @blocker estates list responds with a page of cases', async () => {
    const res = await apiGet(session, ENDPOINTS.courtCases(1, 10));
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.isSuccess).toBeTruthy();
    const items = body?.data?.items ?? [];
    expect(Array.isArray(items)).toBeTruthy();
    expect(items.length, 'at least one estate must exist (5 were seeded)').toBeGreaterThan(0);
    // Real list-item shape: caseId / fileNumber / classification / managers.
    sampleCaseId = items[0]?.caseId;
    expect(sampleCaseId).toBeTruthy();
    // JF-155/156/495: managers are auto-assigned — list must expose the columns.
    expect(items[0]).toHaveProperty('estateManagerName');
    expect(items[0]).toHaveProperty('relationshipManagerName');
  });

  test('@smoke @blocker estate detail loads for a real case', async () => {
    test.skip(!sampleCaseId, 'no case id from list');
    const res = await apiGet(session, ENDPOINTS.courtCase(sampleCaseId!));
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.isSuccess).toBeTruthy();
    expect(body?.data).toBeTruthy();
  });

  test('@high inquiry-status endpoints all respond (heirs/SAMA/CMA/REGA/Marjea/deed)', async () => {
    test.skip(!sampleCaseId, 'no case id from list');
    const id = sampleCaseId!;
    const checks: Array<[string, string]> = [
      ['heirs-listing', ENDPOINTS.heirsListingStatus(id)],
      ['sama', ENDPOINTS.samaInquiriesStatus(id)],
      ['cma', ENDPOINTS.cmaInquiry(id)],
      ['real-estate', ENDPOINTS.realEstateTitlesStatus(id)],
      ['marjea', ENDPOINTS.marjeaInquiry(id)],
      ['deed', ENDPOINTS.deedInquiriesStatus(id)],
    ];
    // This checks only that the inquiry-status endpoints respond. JF-726 (SignalR
    // CORS leaving *values* stuck at "قيد المعالجة") is a separate WebSocket concern
    // and is NOT asserted here, so it is intentionally not annotated.
    for (const [name, path] of checks) {
      const res = await apiGet(session, path);
      expect([200, 204], `${name} inquiry status`).toContain(res.status());
    }
  });

  test('@high assets-by-case grouped endpoint responds', async () => {
    test.skip(!sampleCaseId, 'no case id from list');
    const res = await apiGet(session, ENDPOINTS.assetsByCaseGrouped(sampleCaseId!));
    expect(res.status()).toBe(200);
  });
});
