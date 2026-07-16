import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';
import { annotateKnownIssue } from '../../src/known-issues';

/**
 * Assets & classification — API-first, read-only. Verifies the grouped-assets
 * endpoint stays healthy (JF-393 read path) and guards the two classification
 * blockers so a regression run reports them as KNOWN with their JF keys, and
 * FLIPS to a real pass (surfacing "possibly fixed") once the backend is fixed.
 *
 * JF-1058: investments value is a constant (~6101.84) on every estate, so the
 *          normalized classification score is 0 and ranks A/B are unreachable.
 * JF-927:  asset readiness is non-deterministic / fail-open.
 *
 * AssetType enum (verified CIT): 1=عقار (real estate), 2=مركبة (vehicle), 3=منقول (movable).
 */
const CLASSIFIED_RANKS = ['A', 'B', 'C', 'D', 'أ', 'ب', 'ج', 'د'];

test.describe('Assets & classification (API)', () => {
  let session: ApiSession;
  let caseId: string | undefined;

  test.beforeAll(async () => {
    session = await apiLogin();
    const list = await apiGet(session, '/cases/api/v1/court-cases?pageIndex=1&pageSize=10');
    const items = (await list.json())?.data?.items ?? [];
    caseId = items[0]?.caseId;
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test('@high grouped-assets endpoint responds for a real estate', async () => {
    test.skip(!caseId, 'no case id');
    const res = await apiGet(session, `/cases/api/v1/assets/by-case/${caseId}/grouped`);
    expect(res.status()).toBe(200);
  });

  test('@blocker classification produces reachable ranks A/B (guards JF-1058)', async () => {
    // Once JF-1058 is fixed, some estate in the list should classify to A or B.
    // While the bug is open this assertion fails and is reported KNOWN; a pass
    // means the constant-investments defect is resolved (verify & de-annotate).
    annotateKnownIssue(test, 'JF-1058');
    const res = await apiGet(session, '/cases/api/v1/court-cases?pageIndex=1&pageSize=50');
    const items = (await res.json())?.data?.items ?? [];
    const ranks = items.map((i: { classification?: string }) => i.classification).filter(Boolean);
    const hasHighRank = ranks.some((r: string) => ['A', 'B', 'أ', 'ب'].includes(String(r).trim()));
    expect(hasHighRank, `no estate reached rank A/B (classifications seen: ${JSON.stringify([...new Set(ranks)])})`).toBeTruthy();
  });

  test('@medium classification values, when present, are within the A–D domain', async () => {
    const res = await apiGet(session, '/cases/api/v1/court-cases?pageIndex=1&pageSize=50');
    const items = (await res.json())?.data?.items ?? [];
    for (const i of items) {
      if (i.classification == null || i.classification === '') continue;
      expect(CLASSIFIED_RANKS, `unexpected classification "${i.classification}"`).toContain(String(i.classification).trim());
    }
  });
});
