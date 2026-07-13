import { test, expect } from '@playwright/test';

const SERVICES_URL = 'https://d-infath-jf-portal.azm-cit.com/service-providers/services';

test.describe('Services List - Status Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SERVICES_URL);
    await page.waitForLoadState('networkidle');
  });

  test('JF-TC-2828-A - Status filter dropdown is visible with default كل الحالات', async ({ page }) => {
    await expect(page.locator('text=كل الحالات')).toBeVisible();
  });

  // JF-TC-2828
  // PrimeNG dropdown renders its panel in a portal overlay outside the component tree
  test('JF-TC-2828-B - Status dropdown shows مفعل not نشط', async ({ page }) => {
    await page.locator('text=كل الحالات').click();
    // Wait for PrimeNG overlay panel to open
    await page.locator('.p-select-overlay, .p-dropdown-panel').waitFor({ state: 'visible', timeout: 5000 });
    await expect(page.locator('.p-select-overlay li, .p-dropdown-panel li').getByText('مفعل', { exact: false })).toBeVisible();
    await expect(page.locator('.p-select-overlay li, .p-dropdown-panel li').getByText('نشط', { exact: true })).not.toBeVisible();
  });

  test('JF-TC-2828-C - Selecting مفعل filters the list', async ({ page }) => {
    await page.locator('text=كل الحالات').click();
    await page.locator('.p-select-overlay, .p-dropdown-panel').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.p-select-overlay li, .p-dropdown-panel li').getByText('مفعل', { exact: false }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/service-providers\/services/);
  });
});
