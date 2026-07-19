import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';

/**
 * Heirs confirmation — the form-match endpoint that drives the heirs-confirmation
 * screen (JF-444). Verified during the cycle:
 *   GET /forms/api/v1/forms/match?caseId=<guid>
 *     -> 200 for EstateManager / RelationshipManager / LegalAdvisor
 *     -> 403 for HeadEstateManager  (JF-565, confirmed defect)
 *
 * This runs on the EstateManager session (the authorized role), so it guards the
 * POSITIVE path staying alive after deploys. The HeadEstateManager 403 itself is
 * tracked as JF-565 and can only be reproduced with that role's credentials
 * (not available on CIT) — noted in the test cycle, annotated here for traceability.
 *
 * This project (heir) uses the heir Nafath session for other specs, but this API
 * spec logs in independently via the EstateManager account.
 */
test.describe('Heirs confirmation form-match (API)', () => {
  let session: ApiSession;
  let caseId: string | undefined;

  test.beforeAll(async () => {
    session = await apiLogin(); // EstateManager
    const list = await apiGet(session, '/cases/api/v1/court-cases?pageIndex=1&pageSize=10');
    const items = (await list.json())?.data?.items ?? [];
    caseId = items[0]?.caseId;
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // The HeadEstateManager 403 (JF-565) can only be reproduced with that role's
  // credentials (not available on CIT); it is tracked in the test cycle. Here we
  // guard the authorized-role positive path so a deploy that breaks it is caught.
  test('@blocker forms/match returns 200 for an authorized role (EstateManager)', async () => {
    test.skip(!caseId, 'no case id');
    const res = await apiGet(session, `/forms/api/v1/forms/match?caseId=${caseId}`);
    expect(res.status(), 'authorized roles must reach the heirs-confirmation form match').toBe(200);
  });
});
