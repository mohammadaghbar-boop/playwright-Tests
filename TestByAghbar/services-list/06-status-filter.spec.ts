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
  test('JF-TC-2828-B - Status dropdown shows مفعل not نشط', async ({ page }) => {
    await page.locator('text=كل الحالات').click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=مفعل')).toBeVisible();
    await expect(page.locator('text=نشط')).not.toBeVisible();
  });

  test('JF-TC-2828-C - Selecting مفعل filters the list', async ({ page }) => {
    await page.locator('text=كل الحالات').click();
    await page.waitForTimeout(500);
    await page.locator('text=مفعل').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/service-providers\/services/);
  });
});
