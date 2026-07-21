import { test, expect } from '@playwright/test';
import { EstatesListPage } from '../../src/pages/EstatesListPage';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';
import { dbAvailable, dbQuery } from '../../src/db';

/**
 * FRONTEND (UI) layer for the estate backbone (JF-22/7/8/9/10). The API side is covered
 * by estates-api.spec.ts; this pins the rendered estates LIST (/court-cases with the
 * التصنيف + المصفي columns and data rows) and the estate DETAIL tabs (بيانات التركة /
 * الورثة / الأصول / سجل التركة). Selectors come from the pack's EstatesListPage POM,
 * which mirrors the team suite's ground-truth POM.
 *
 * Runs under the 'internal' project (pd.json = EstateManager — the role authorized for
 * the backbone). Read-only: opens and reads, never mutates estate state.
 *
 * Plus a @db verification against live [Case].CourtCases (skips cleanly without CB_* creds) that an estate shown by the
 * API genuinely exists in cases.court_cases.
 */
const ESTATE_CANDIDATES = ['INH00016', 'INH00009', 'INH00007', 'INH00005'] as const;

test.describe('Estates list & detail screens (UI)', () => {
  test('@smoke @blocker /court-cases renders the estates table with التصنيف + المصفي columns and rows', async ({ page }) => {
    const estates = new EstatesListPage(page);
    await estates.goto();

    // JF-464 classification + JF-415 liquidator columns.
    await expect(estates.classificationHeader()).toBeVisible({ timeout: 20_000 });
    await expect(estates.liquidatorHeader()).toBeVisible();

    // At least one seeded estate file (INH000xx) is listed.
    await expect(page.getByRole('main').getByText(/INH\d{5}/).first()).toBeVisible({ timeout: 20_000 });
    await expect(estates.rows().first()).toBeVisible();
  });

  test('@high an estate opens and its four detail tabs render', async ({ page }) => {
    const estates = new EstatesListPage(page);
    const opened = await estates.openEstate(ESTATE_CANDIDATES);
    test.skip(!opened, `no seeded estate reachable from: ${ESTATE_CANDIDATES.join(', ')}`);
    test.info().annotations.push({ type: 'observed', description: `opened estate ${opened}` });

    const main = page.getByRole('main');
    for (const tab of EstatesListPage.DETAIL_TABS) {
      await expect(main.getByText(tab, { exact: false }).first(), `tab "${tab}" should be present`).toBeVisible();
    }
  });

  test('@medium @db an estate shown by the API exists in [Case].CourtCases', async () => {
    test.skip(!dbAvailable(), 'DB creds (CB_*) not configured');

    // Pull a real estate the UI/API surfaces, then verify its row in the DB.
    let caseId: string | undefined;
    let deceasedNid: string | undefined;
    let session: ApiSession | undefined;
    try {
      session = await apiLogin();
      const listRes = await apiGet(session, ENDPOINTS.courtCases(1, 10));
      expect(listRes.status()).toBe(200);
      const list = await listRes.json();
      const items = list?.data?.items ?? [];
      expect(items.length, 'the estates list must expose at least one case').toBeGreaterThan(0);
      caseId = items[0]?.caseId;
      // The detail may expose the deceased national id for a stronger cross-check.
      if (caseId) {
        const detailRes = await apiGet(session, ENDPOINTS.courtCase(caseId));
        if (detailRes.status() === 200) {
          const d = (await detailRes.json())?.data ?? {};
          deceasedNid = d.deceasedNationalId ?? d.deceasedNationalID ?? d.nationalId;
        }
      }
    } finally {
      await session?.ctx.dispose();
    }
    expect(caseId, 'a caseId is required for the DB cross-check').toBeTruthy();

    // DB side (SELECT-only). [Case].CourtCases is the ground-truth cases table (id PK,
    // deceased_national_id) in the live Azm_JointFunds SQL Server. The schema name `Case`
    // is a T-SQL reserved keyword, so it MUST be bracketed. The estate the API returned
    // must exist there.
    const row = await dbQuery<{ id: string; deceased_national_id: string | null }>(
      `SELECT id, deceased_national_id FROM [Case].CourtCases WHERE id = $1`,
      [caseId!],
    );
    expect(row.rowCount, `[Case].CourtCases must contain the estate ${caseId} the API returned`).toBe(1);
    // SQL Server stores/returns GUIDs upper-cased while the API emits them lower-cased —
    // compare case-insensitively.
    expect(String(row.rows[0].id).toLowerCase()).toBe(String(caseId).toLowerCase());
    // Values come back as strings from the CloudBeaver relay — compare as strings.
    if (deceasedNid) {
      expect(String(row.rows[0].deceased_national_id)).toBe(String(deceasedNid));
    }
    test.info().annotations.push({
      type: 'db-verify',
      description: `[Case].CourtCases row confirmed for estate ${caseId}${deceasedNid ? ` (deceased_national_id matched)` : ''}`,
    });
  });
});
