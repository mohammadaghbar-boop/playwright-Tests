import { test, expect } from '@playwright/test';

// Each login test must start with a completely clean browser state
// so Keycloak doesn't skip the mock-user flow due to an active session
test.use({ storageState: { cookies: [], origins: [] } });

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

test.describe('Login Flow', () => {
  test('JF-LOGIN-01 - Login page loads with service providers card', async ({ page }) => {
    await page.goto(`${BASE_URL}/nafath-login`);
    await expect(page.getByTestId('portal-card-service-providers')).toBeVisible();
  });

  test('JF-LOGIN-02 - Nafath mock login redirects to service providers', async ({ page }) => {
    await page.goto(`${BASE_URL}/nafath-login`);
    await page.getByTestId('portal-card-service-providers').click();
    await page.getByRole('link', { name: 'Nafath' }).click();
    await page.getByRole('button', { name: 'Mock Users' }).click();
    await page.getByRole('button', { name: 'اختيار' }).first().click();
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    await page.waitForURL('**/service-providers/**', { timeout: 60000 });
    await expect(page).toHaveURL(/service-providers/);
  });

  test('JF-LOGIN-03 - Facility selection navigates to dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/nafath-login`);
    await page.getByTestId('portal-card-service-providers').click();
    await page.getByRole('link', { name: 'Nafath' }).click();
    await page.getByRole('button', { name: 'Mock Users' }).click();
    await page.getByRole('button', { name: 'اختيار' }).first().click();
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    await page.waitForURL('**/service-providers/**', { timeout: 60000 });
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'الدخول على المنشأة' }).first().click();
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/nafath-login/);
  });
});
