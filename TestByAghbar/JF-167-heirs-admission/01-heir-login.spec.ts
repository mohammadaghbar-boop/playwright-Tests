import { test, expect } from '@playwright/test';

// Tests the heir Nafath SSO login flow — runs WITHOUT storageState so it
// exercises the full Keycloak redirect chain from scratch.
test.use({ storageState: { cookies: [], origins: [] } });

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

test.describe('JF-167 — Heir Login', () => {
  test('JF-TC-HA-01 - Nafath login page loads with Heirs portal card', async ({ page }) => {
    await page.goto(`${BASE_URL}/nafath-login`);
    await expect(page.getByTestId('portal-card-heirs')).toBeVisible();
  });

  test('JF-TC-HA-02 - Clicking Heirs portal card shows Nafath login option', async ({ page }) => {
    await page.goto(`${BASE_URL}/nafath-login`);
    await page.getByTestId('portal-card-heirs').click();
    await expect(page.getByRole('link', { name: 'Nafath' })).toBeVisible();
  });

  test('JF-TC-HA-03 - Mock user login as heir redirects to /heirs dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/nafath-login`);
    await page.getByTestId('portal-card-heirs').click();
    await page.getByRole('link', { name: 'Nafath' }).click();
    await page.getByRole('button', { name: 'Mock Users' }).click();
    await page.getByRole('button', { name: 'اختيار' }).first().click();
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    try {
      await page.waitForURL('**/heirs/**', { timeout: 90000 });
    } catch {
      await page.waitForURL('**/heirs/**', { timeout: 30000 });
    }

    await expect(page).toHaveURL(/\/heirs\//);
  });
});
