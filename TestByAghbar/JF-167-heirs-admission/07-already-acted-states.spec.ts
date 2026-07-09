import { test, expect } from '@playwright/test';

// Tests that assets already confirmed/rejected show the correct status badge
// and do NOT show the action button again (prevents duplicate submissions).

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';
const COURT_CASES_URL = `${BASE_URL}/heirs/court-cases`;

async function waitForPage(page: any, url: string) {
  try {
    await page.goto(url);
  } catch {
    await page.waitForTimeout(2000);
    await page.goto(url);
  }
  await page.waitForLoadState('networkidle');
}

async function findAssetWithState(page: any, testId: string): Promise<boolean> {
  await waitForPage(page, COURT_CASES_URL);
  await Promise.race([
    page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    page.locator('text=لا توجد').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);
  if (!await page.locator('table tbody tr').first().isVisible()) return false;

  const caseLinks = await page.locator('table tbody tr a').all();
  for (const link of caseLinks) {
    await link.click();
    await page.waitForLoadState('networkidle');

    const assetLinks = await page.locator('table tbody tr a').all();
    for (const assetLink of assetLinks) {
      await assetLink.click();
      await page.waitForLoadState('networkidle');
      if (await page.getByTestId(testId).isVisible()) return true;
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
    await waitForPage(page, COURT_CASES_URL);
  }
  return false;
}

test.describe('JF-167 — Already Acted States', () => {
  test('JF-TC-HA-24 - Confirmed asset shows تم الإقرار badge and no action button', async ({ page }) => {
    const found = await findAssetWithState(page, 'heir-ack-status-confirmed');
    test.skip(!found, 'No confirmed asset found for this heir');

    await expect(page.getByTestId('heir-ack-status-confirmed')).toBeVisible();
    await expect(page.getByTestId('heir-ack-status-confirmed')).toContainText('تم الإقرار');
    await expect(page.getByTestId('heir-ack-button')).not.toBeVisible();
  });

  test('JF-TC-HA-25 - Rejected asset shows تم تقديم إفصاح badge and no action button', async ({ page }) => {
    const found = await findAssetWithState(page, 'heir-ack-status-rejected');
    test.skip(!found, 'No rejected asset found for this heir');

    await expect(page.getByTestId('heir-ack-status-rejected')).toBeVisible();
    await expect(page.getByTestId('heir-ack-status-rejected')).toContainText('تم تقديم إفصاح');
    await expect(page.getByTestId('heir-ack-button')).not.toBeVisible();
  });
});
