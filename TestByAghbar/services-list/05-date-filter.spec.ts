import { test, expect } from '@playwright/test';

const SERVICES_URL = 'https://d-infath-jf-portal.azm-cit.com/service-providers/services';

test.describe('Services List - Date Range Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SERVICES_URL);
    await page.waitForLoadState('networkidle');
  });

  test('JF-TC-2827-A - Date range inputs are visible', async ({ page }) => {
    await expect(page.locator('input[placeholder="سنة-شهر-يوم"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder="سنة-شهر-يوم"]').last()).toBeVisible();
  });

  // JF-TC-2827
  test('JF-TC-2827-B - End date before start date shows validation error', async ({ page }) => {
    await page.locator('input[placeholder="سنة-شهر-يوم"]').first().fill('2026-06-18');
    await page.locator('input[placeholder="سنة-شهر-يوم"]').last().fill('2026-06-09');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=يجب أن يكون تاريخ')).toBeVisible();
  });

  test('JF-TC-2827-C - Valid date range does not show validation error', async ({ page }) => {
    await page.locator('input[placeholder="سنة-شهر-يوم"]').first().fill('2026-06-01');
    await page.locator('input[placeholder="سنة-شهر-يوم"]').last().fill('2026-06-30');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=يجب أن يكون تاريخ')).not.toBeVisible();
  });
});
