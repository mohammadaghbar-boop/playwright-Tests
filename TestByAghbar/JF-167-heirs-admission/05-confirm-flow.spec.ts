import { test, expect } from '@playwright/test';

// Tests the Confirm decision flow:
// heir-ack-button → modal → heir-ack-confirm-btn → success view → heir-ack-close
// After confirm: heir-ack-status-confirmed badge replaces the button.
//
// NOTE: Confirming is a write operation that changes asset state.
// This test is designed for a dedicated QA asset that can be re-used (reset between runs).

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

async function navigateToActionableAsset(page: any): Promise<boolean> {
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
      if (await page.getByTestId('heir-ack-button').isVisible()) return true;
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
    await waitForPage(page, COURT_CASES_URL);
  }
  return false;
}

test.describe('JF-167 — Confirm Flow', () => {
  test('JF-TC-HA-16 - Clicking Confirm shows success screen تم الإقرار بنجاح', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found — confirm flow cannot be tested');

    await page.getByTestId('heir-ack-button').click();
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('heir-ack-confirm-btn').click();

    // Wait for success view
    await expect(page.getByText('تم الإقرار بنجاح')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('تم تسجيل إقراركم بعدم وجود التزام على الأصل')).toBeVisible();
  });

  test('JF-TC-HA-17 - Close button dismisses the confirmed modal', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found');

    await page.getByTestId('heir-ack-button').click();
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('heir-ack-confirm-btn').click();
    await page.getByText('تم الإقرار بنجاح').waitFor({ state: 'visible', timeout: 15000 });

    await page.getByTestId('heir-ack-close').click();

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('JF-TC-HA-18 - After confirm, asset shows تم الإقرار status badge instead of button', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found');

    await page.getByTestId('heir-ack-button').click();
    await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('heir-ack-confirm-btn').click();
    await page.getByText('تم الإقرار بنجاح').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('heir-ack-close').click();

    await expect(page.getByTestId('heir-ack-status-confirmed')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('heir-ack-status-confirmed')).toContainText('تم الإقرار');
    await expect(page.getByTestId('heir-ack-button')).not.toBeVisible();
  });
});
