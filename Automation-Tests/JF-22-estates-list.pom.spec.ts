import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { EstatesListPage } from './pages/EstatesListPage';

/**
 * REFERENCE / PILOT spec for the Page Object Model pattern (Phase 4 foundation).
 *
 * Note how the spec reads as intent only — no selectors, no `waitForTimeout`, no
 * `networkidle`, no inline login. That logic lives in pages/. Use this as the template
 * when migrating the rest of the suite story-by-story.
 *
 * Credentials come from env with a demo fallback (Phase 1 secrets direction).
 */
const LIQUIDATOR = {
  email: process.env.LIQUIDATOR_EMAIL ?? 'demo-liquidator@azm.sa',
  password: process.env.LIQUIDATOR_PASSWORD ?? 'Azm@123',
};

test.describe('JF-22 — Estates List (POM pilot)', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(LIQUIDATOR);
    await new EstatesListPage(page).goto();
  });

  test('lands on the estates list with at least one row', async ({ page }) => {
    const estates = new EstatesListPage(page);
    await expect(page).toHaveURL(/\/court-cases/);
    expect(await estates.rows().count()).toBeGreaterThanOrEqual(1);
  });

  test('search by an existing estate number shows a matching row', async ({ page }) => {
    const estates = new EstatesListPage(page);
    const estateNumber = await estates.firstEstateNumber();
    await estates.searchByEstateNumber(estateNumber);
    await expect(
      page.locator('table tbody').getByText(estateNumber, { exact: false }),
    ).toBeVisible();
  });
});
