import { test, expect } from '@playwright/test';

const SERVICES_URL = 'https://d-infath-jf-portal.azm-cit.com/service-providers/services';

test.describe('Services List - Display & Columns', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SERVICES_URL);
    await page.waitForLoadState('networkidle');
  });

  // JF-TC-2821
  test('JF-TC-2821-A - Column: نوع الخدمة is visible', async ({ page }) => {
    await expect(page.locator('text=نوع الخدمة').first()).toBeVisible();
  });

  test('JF-TC-2821-B - Column: النوع الفرعي is visible', async ({ page }) => {
    await expect(page.locator('text=النوع الفرعي').first()).toBeVisible();
  });

  test('JF-TC-2821-C - Column: التصنيف is visible', async ({ page }) => {
    await expect(page.locator('text=التصنيف').first()).toBeVisible();
  });

  test('JF-TC-2821-D - Column: رقم الترخيص is visible', async ({ page }) => {
    await expect(page.locator('text=رقم الترخيص').first()).toBeVisible();
  });

  test('JF-TC-2821-E - Column: تاريخ آخر تحديث is visible', async ({ page }) => {
    await expect(page.locator('text=تاريخ آخر تحديث').first()).toBeVisible();
  });

  test('JF-TC-2821-F - Column: حالة الخدمة is visible', async ({ page }) => {
    await expect(page.locator('text=حالة الخدمة').first()).toBeVisible();
  });

  test('JF-TC-2821-G - Column: عرض التفاصيل is visible', async ({ page }) => {
    await expect(page.locator('text=عرض التفاصيل').first()).toBeVisible();
  });

  test('JF-TC-2821-ALL - All required columns are visible', async ({ page }) => {
    const columns = [
      'نوع الخدمة',
      'النوع الفرعي',
      'التصنيف',
      'رقم الترخيص',
      'تاريخ آخر تحديث',
      'حالة الخدمة',
      'عرض التفاصيل',
    ];
    for (const col of columns) {
      await expect(page.locator(`text=${col}`).first()).toBeVisible();
    }
  });
});
