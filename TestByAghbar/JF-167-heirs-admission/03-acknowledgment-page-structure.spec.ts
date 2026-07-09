import { test, expect } from '@playwright/test';

// Tests the acknowledgment action button/badge structure on the asset detail page.
// Navigates to /heirs/court-cases → finds a case → finds an asset → checks the
// heir-ack-button is rendered when the asset is actionable.

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

/** Navigate to the first available case's detail page. Returns false if no cases found. */
async function navigateToFirstCase(page: any): Promise<boolean> {
  await waitForPage(page, COURT_CASES_URL);
  await Promise.race([
    page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    page.locator('text=لا توجد').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);
  const hasRows = await page.locator('table tbody tr').first().isVisible();
  if (!hasRows) return false;

  // Click the first case row / view link
  const viewLink = page.getByRole('link', { name: /عرض|تفاصيل/ }).first();
  const rowLink = page.locator('table tbody tr').first().locator('a').first();
  const target = (await viewLink.isVisible()) ? viewLink : rowLink;
  await target.click();
  await page.waitForLoadState('networkidle');
  return true;
}

/** From a case detail page, navigate to the first asset. Returns false if none. */
async function navigateToFirstAsset(page: any): Promise<boolean> {
  await Promise.race([
    page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    page.locator('text=لا توجد').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);
  const hasAssets = await page.locator('table tbody tr').first().isVisible();
  if (!hasAssets) return false;

  const assetLink = page.getByRole('link', { name: /عرض|تفاصيل/ }).first();
  const rowLink = page.locator('table tbody tr').first().locator('a').first();
  const target = (await assetLink.isVisible()) ? assetLink : rowLink;
  await target.click();
  await page.waitForLoadState('networkidle');
  return true;
}

test.describe('JF-167 — Acknowledgment Page Structure', () => {
  test('JF-TC-HA-08 - Asset detail page renders under /heirs/court-cases/:caseId/assets/:assetId', async ({ page }) => {
    const hasCases = await navigateToFirstCase(page);
    test.skip(!hasCases, 'No court cases available for this heir');

    const hasAssets = await navigateToFirstAsset(page);
    test.skip(!hasAssets, 'No assets in first case');

    await expect(page).toHaveURL(/\/heirs\/court-cases\/[\w-]+\/assets\/[\w-]+/);
  });

  test('JF-TC-HA-09 - Acknowledgment action (button or status badge) is rendered on asset page', async ({ page }) => {
    const hasCases = await navigateToFirstCase(page);
    test.skip(!hasCases, 'No court cases available for this heir');

    const hasAssets = await navigateToFirstAsset(page);
    test.skip(!hasAssets, 'No assets in first case');

    // One of these three states must be present: actionable button, confirmed badge, rejected badge
    await Promise.race([
      page.getByTestId('heir-ack-button').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      page.getByTestId('heir-ack-status-confirmed').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
      page.getByTestId('heir-ack-status-rejected').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    ]);

    const anyVisible =
      (await page.getByTestId('heir-ack-button').isVisible()) ||
      (await page.getByTestId('heir-ack-status-confirmed').isVisible()) ||
      (await page.getByTestId('heir-ack-status-rejected').isVisible());

    expect(anyVisible).toBe(true);
  });

  test('JF-TC-HA-10 - Actionable button shows correct label إقرار جاهزية الأصل', async ({ page }) => {
    const hasCases = await navigateToFirstCase(page);
    test.skip(!hasCases, 'No court cases available for this heir');

    const hasAssets = await navigateToFirstAsset(page);
    test.skip(!hasAssets, 'No assets in first case');

    const btn = page.getByTestId('heir-ack-button');
    test.skip(!await btn.isVisible(), 'Asset is not in actionable state (already confirmed/rejected)');

    await expect(btn).toContainText('إقرار جاهزية الأصل');
  });
});
