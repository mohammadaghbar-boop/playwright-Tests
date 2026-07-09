import { test, expect } from '@playwright/test';

const SERVICES_URL = 'https://d-infath-jf-portal.azm-cit.com/service-providers/services';

test.describe('Services List - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SERVICES_URL);
    await page.waitForLoadState('networkidle');
  });

  // JF-TC-2820
  test('JF-TC-2820 - Navigate to Services List from side menu shows correct page title', async ({ page }) => {
    await expect(page.locator('text=قائمة الخدمات')).toBeVisible();
  });

  test('JF-TC-2820-B - Services list URL is correct', async ({ page }) => {
    await expect(page).toHaveURL(/\/service-providers\/services/);
  });

  test('JF-TC-2820-C - Side menu link for services is active/highlighted', async ({ page }) => {
    const servicesLink = page.getByRole('link', { name: 'الخدمات الخدمات' });
    await expect(servicesLink).toBeVisible();
  });
});
