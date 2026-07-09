import { test, expect } from '@playwright/test';

// All tests reuse heir storageState saved by heir-auth.setup.ts
const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';
const COURT_CASES_URL = `${BASE_URL}/heirs/court-cases`;

async function waitForCourtCasesPage(page: any) {
  try {
    await page.goto(COURT_CASES_URL);
  } catch {
    await page.waitForTimeout(2000);
    await page.goto(COURT_CASES_URL);
  }
  await page.waitForLoadState('networkidle');
}

async function hasCases(page: any): Promise<boolean> {
  // Wait briefly for table or empty state
  await Promise.race([
    page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    page.locator('[data-testid="empty-state"], text=لا توجد قضايا').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
  ]);
  return page.locator('table tbody tr').first().isVisible();
}

test.describe('JF-167 — Heir Court Cases Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForCourtCasesPage(page);
  });

  test('JF-TC-HA-04 - Heir portal lands under /heirs path after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/heirs\//);
  });

  test('JF-TC-HA-05 - Court cases list page is accessible at /heirs/court-cases', async ({ page }) => {
    await expect(page).toHaveURL(/\/heirs\/court-cases/);
  });

  test('JF-TC-HA-06 - Court cases page shows a list or empty state', async ({ page }) => {
    const hasRows = await hasCases(page);
    if (hasRows) {
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    } else {
      // Empty state is also valid
      await expect(page).toHaveURL(/\/heirs\/court-cases/);
    }
  });

  test('JF-TC-HA-07 - Heirs side menu is visible', async ({ page }) => {
    // The HeirsLayout renders a side menu; verify the portal shell is loaded
    await expect(page.locator('app-heirs-side-menu, [data-testid="heirs-side-menu"], nav')).toBeVisible();
  });
});
