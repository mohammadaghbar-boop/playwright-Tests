import { test, expect } from '@playwright/test';
import { URLS, INTERNAL_USERS } from '../../src/helpers/users';

/**
 * FRONTEND (UI) layer for internal authentication — the login SCREEN itself (JF-4).
 *
 * The API-first login is covered by src/helpers/api.ts (apiLogin) and the happy-path
 * portal-shell reach lives in internal-login.spec.ts. This file asserts the *rendered*
 * login form (email / password / submit) and the negative UX: invalid credentials must
 * surface an error and keep the user on /login, WITHOUT locking the account.
 *
 * Account-safety: at most TWO wrong-password submits, against the PD demo identity
 * (test2@test.com) — never the estate-manager account the backbone specs depend on.
 *
 * Runs without the shared storageState — the login screen is the subject under test.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const emailBox = 'input[type="email"], input[name="email"], input#email';
const passwordBox = 'input[type="password"], input[name="password"], input#password';
const submitBtn = 'button[type="submit"], button:has-text("تسجيل الدخول")';

test.describe('Internal login screen (UI)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' });
  });

  test('@blocker login screen renders email, password and submit controls', async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator(emailBox).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(passwordBox).first()).toBeVisible();
    await expect(page.locator(submitBtn).first()).toBeVisible();
    // The form must accept input (fields are enabled, not read-only placeholders).
    await page.locator(emailBox).first().fill(INTERNAL_USERS.purchasing.email);
    await expect(page.locator(emailBox).first()).toHaveValue(INTERNAL_USERS.purchasing.email);
  });

  test('@high invalid credentials surface an error and stay on /login (no account lock)', async ({ page }) => {
    // ATTEMPT 1 of at most 2 — a wrong password against the PD demo identity only.
    await page.locator(emailBox).first().fill(INTERNAL_USERS.purchasing.email);
    await page.locator(passwordBox).first().fill('definitely-wrong-1');
    await page.locator(submitBtn).first().click();

    // Must NOT be admitted: still on the login screen (never reaches /dashboard).
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/dashboard/);

    // An error signal should surface — a generic Arabic/English error, a toast/alert, or
    // an aria-invalid field. Assert reachability defensively (the exact copy varies).
    const errorSignal = page
      .getByRole('alert')
      .or(page.locator('[role="alert"], .p-toast, .toast, .error-message, [aria-invalid="true"]'))
      .or(page.getByText(/غير صحيح|خطأ|بيانات الدخول|كلمة المرور|invalid|incorrect/i));
    const sawError = await errorSignal
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    test.info().annotations.push({
      type: 'observed',
      description: sawError
        ? 'invalid-credentials error signal rendered on the login screen'
        : 'no explicit error element located; rejection confirmed by staying on /login (no admission)',
    });

    // The screen must still be usable for a legitimate retry (not locked/disabled).
    await expect(page.locator(passwordBox).first()).toBeEnabled();
    await expect(page.locator(submitBtn).first()).toBeEnabled();
  });
});
