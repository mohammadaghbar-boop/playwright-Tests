import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';

/**
 * Liquidator assignment lifecycle — API-first, read-only regression guard.
 * Round-3 (2026-07-16) proved the assignment pipeline works end-to-end: a seeded
 * estate emits an assignment request (event 23), the liquidator accepts it, and the
 * estate carries the liquidator thereafter (JF-172 / JF-363). This guards that a
 * known assigned estate stays assigned — i.e. the accept persists and the estates
 * list keeps exposing the liquidator column.
 *
 * Golden fixture: estate INH00016 (status 11, liquidator Majed ALQAHTANI accepted).
 * Endpoint: GET /cases/api/v1/court-cases (list item carries liquidatorName + status).
 */
const GOLDEN_ASSIGNED = 'INH00016';

test.describe('Liquidator assignment lifecycle (API)', () => {
  let session: ApiSession;

  test.beforeAll(async () => {
    session = await apiLogin(); // EstateManager can read the estates list
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test('@high at least one estate has a liquidator assigned (JF-172/363 outcome persists)', async () => {
    const res = await apiGet(session, '/cases/api/v1/court-cases?pageIndex=1&pageSize=50');
    expect(res.status()).toBe(200);
    const items = (await res.json())?.data?.items ?? [];
    const assigned = items.filter((i: { liquidatorName?: string }) => i.liquidatorName);
    expect(
      assigned.length,
      'no estate carries a liquidator — the assignment→accept lifecycle may be broken',
    ).toBeGreaterThan(0);
  });

  test('@medium the golden assigned estate keeps its liquidator', async () => {
    const res = await apiGet(session, '/cases/api/v1/court-cases?pageIndex=1&pageSize=50');
    const items = (await res.json())?.data?.items ?? [];
    const golden = items.find((i: { fileNumber?: string }) => i.fileNumber === GOLDEN_ASSIGNED);
    // If the fixture was cleaned up in a reseed, skip rather than fail — the @high
    // test above still guards the lifecycle generically.
    test.skip(!golden, `${GOLDEN_ASSIGNED} not present (environment reseeded)`);
    expect(golden.liquidatorName, `${GOLDEN_ASSIGNED} should retain its accepted liquidator`).toBeTruthy();
  });
});
