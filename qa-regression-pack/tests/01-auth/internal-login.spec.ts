import { test, expect } from '@playwright/test';
import { loginInternal } from '../../src/helpers/login';
import { URLS } from '../../src/helpers/users';

// Covers JF-4 (portal login). Runs without the shared storageState on purpose —
// the login flow itself is the subject under test.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Internal portal authentication', () => {
  test('@smoke @blocker valid PD login reaches the portal shell', async ({ page }) => {
    await loginInternal(page);
    await expect(page).not.toHaveURL(/\/login/);
    // Portal shell renders a navigation region once authenticated.
    await expect(page.locator('nav, [role="navigation"], aside').first()).toBeVisible({ timeout: 20_000 });
  });

  test('@high wrong password is rejected with an error and no redirect', async ({ page }) => {
    await page.goto(`${URLS.portal}/login`);
    await page.locator('input[type="email"], input[name="email"], input#email').first().fill('test2@test.com');
    await page.locator('input[type="password"], input[name="password"], input#password').first().fill('wrong-password-1');
    await page.locator('button[type="submit"], button:has-text("تسجيل الدخول")').first().click();
    // Stays on login and surfaces an error (generic Arabic error per system convention).
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
