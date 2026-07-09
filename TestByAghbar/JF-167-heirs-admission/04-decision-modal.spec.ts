import { test, expect } from '@playwright/test';

// Tests the decision modal that opens when the heir clicks إقرار جاهزية الأصل.
// Covers: modal structure, asset/inheritance numbers displayed, Confirm and Reject buttons.

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

/** Navigate to first actionable asset (heir-ack-button visible). Returns false if none found. */
async function navigateToActionableAsset(page: any): Promise<boolean> {
  await waitForPage(page, COURT_CASES_URL);
  await Promise.race([
    page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    page.locator('text=لا توجد').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);
  if (!await page.locator('table tbody tr').first().isVisible()) return false;

  // Try each case row until we find an asset with heir-ack-button
  const caseLinks = page.locator('table tbody tr a').all();
  for (const link of await caseLinks) {
    await link.click();
    await page.waitForLoadState('networkidle');

    await Promise.race([
      page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
      page.locator('text=لا توجد').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    ]);

    const assetLinks = await page.locator('table tbody tr a').all();
    for (const assetLink of assetLinks) {
      await assetLink.click();
      await page.waitForLoadState('networkidle');

      if (await page.getByTestId('heir-ack-button').isVisible()) return true;

      await page.goBack();
      await page.waitForLoadState('networkidle');
    }

    await waitForPage(page, COURT_CASES_URL);
  }
  return false;
}

test.describe('JF-167 — Decision Modal', () => {
  test.beforeEach(async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    if (!found) test.skip(true, 'No asset in actionable state found for this heir');
  });

  test('JF-TC-HA-11 - Clicking acknowledgment button opens decision modal', async ({ page }) => {
    await page.getByTestId('heir-ack-button').click();
    // Dialog should appear
    await expect(page.locator('p-dialog, app-dialog, [role="dialog"]')).toBeVisible({ timeout: 5000 });
  });

  test('JF-TC-HA-12 - Decision modal shows asset number and inheritance number', async ({ page }) => {
    await page.getByTestId('heir-ack-button').click();
    await page.locator('p-dialog, app-dialog, [role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

    await expect(page.getByText('رقم الأصل')).toBeVisible();
    await expect(page.getByText('رقم التركة')).toBeVisible();
  });

  test('JF-TC-HA-13 - Decision modal shows Confirm button الإقرار بعدم وجود التزام', async ({ page }) => {
    await page.getByTestId('heir-ack-button').click();
    await page.locator('p-dialog, app-dialog, [role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

    await expect(page.getByTestId('heir-ack-confirm-btn')).toBeVisible();
    await expect(page.getByTestId('heir-ack-confirm-btn')).toContainText('الإقرار بعدم وجود التزام');
  });

  test('JF-TC-HA-14 - Decision modal shows Reject button إنشاء إفصاح', async ({ page }) => {
    await page.getByTestId('heir-ack-button').click();
    await page.locator('p-dialog, app-dialog, [role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

    await expect(page.getByTestId('heir-ack-reject-btn')).toBeVisible();
    await expect(page.getByTestId('heir-ack-reject-btn')).toContainText('إنشاء إفصاح');
  });

  test('JF-TC-HA-15 - Modal title is إقرار جاهزية الأصل', async ({ page }) => {
    await page.getByTestId('heir-ack-button').click();
    await page.locator('p-dialog, app-dialog, [role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

    await expect(page.getByText('إقرار جاهزية الأصل')).toBeVisible();
  });
});
