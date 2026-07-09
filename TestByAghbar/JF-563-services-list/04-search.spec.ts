import { test, expect } from '@playwright/test';

const SERVICES_URL = 'https://d-infath-jf-portal.azm-cit.com/service-providers/services';

test.describe('Services List - License Number Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SERVICES_URL);
    await page.waitForLoadState('networkidle');
    // Wait for table to be ready before interacting with filters
    await page.locator('table').waitFor({ state: 'visible', timeout: 15000 });
  });

  // JF-TC-2825
  test('JF-TC-2825-A - Search input field is visible', async ({ page }) => {
    await expect(page.getByPlaceholder('ابحث برقم الترخيص')).toBeVisible();
  });

  test('JF-TC-2825-B - Partial license number search returns results', async ({ page }) => {
    await page.getByPlaceholder('ابحث برقم الترخيص').fill('123');
    await page.waitForLoadState('networkidle');
    // Wait for at least one row to appear after search
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await expect(rows).not.toHaveCount(0);
  });

  test('JF-TC-2825-C - Clearing search input restores full list', async ({ page }) => {
    await page.getByPlaceholder('ابحث برقم الترخيص').fill('123');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('ابحث برقم الترخيص').clear();
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    await expect(rows).not.toHaveCount(0);
  });

  // JF-TC-2831
  test('JF-TC-2831 - Search with non-existent license shows empty state message', async ({ page }) => {
    await page.getByPlaceholder('ابحث برقم الترخيص').fill('ZZZZNOTEXIST999');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=لا توجد نتائج مطابقة لمعايير البحث')).toBeVisible();
  });
});
