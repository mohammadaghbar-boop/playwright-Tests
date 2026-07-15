import { Page } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';
const SSO_URL = 'https://d-infath-sso.azm-cit.com';
const MOCK_NAFATH_URL = 'https://qa-infath-mocks.azm-dev.com';

// Credentials come from environment (.env, gitignored) — never hardcode secrets here.
// superadmin is a privileged account, so there is no in-source fallback: set
// SUPER_ADMIN_PASSWORD in .env (see .env.example). PD is a demo account, so a demo
// fallback is kept for out-of-the-box convenience.
export const SUPER_ADMIN = {
  email: process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@infath.sa',
  password: process.env.SUPER_ADMIN_PASSWORD ?? '',
};

export const PD_USER = {
  email: process.env.PD_EMAIL ?? 'test2@test.com',
  password: process.env.PD_PASSWORD ?? 'Azm@123',
};

// ── Internal helper ────────────────────────────────────────────────────────────

/**
 * Shared Nafath mock login flow.
 * 1. Lands on the mock Nafath OIDC page (qa-infath-mocks.azm-dev.com)
 * 2. Expands Mock Users panel
 * 3. Picks the nth active user (0 = first)
 * 4. Submits → redirects back to portal
 */
async function completeNafathMockLogin(page: Page, user: number | string = 0): Promise<void> {
  // Expand mock users
  await page.locator('#btnToggleUsers, button:has-text("Mock Users")').click();
  await page.waitForTimeout(500);

  // Select by national ID (data-fill value) when a string is passed, otherwise by
  // positional index — اختيار fills the national ID via data-fill.
  const selectBtns =
    typeof user === 'string'
      ? page.locator(`button[data-fill="${user}"]`)
      : page.locator('button.user-select-btn, button[data-fill]').nth(user);
  await selectBtns.first().click();
  await page.waitForTimeout(300);

  // Submit
  await page.locator('#btnStartNafath, button:has-text("تسجيل الدخول")').first().click();

  // Wait for redirect back to portal
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

// ── Public login helpers ───────────────────────────────────────────────────────

/**
 * Logs in as a Service Provider via:
 *   /nafath-login → مزود الخدمة → Keycloak SSO → Nafath mock → Mock Users
 * Lands on: /service-providers/companies
 */
export async function loginAsServiceProvider(page: Page, user: number | string = 0): Promise<void> {
  await page.goto(`${BASE_URL}/nafath-login`);
  await page.waitForLoadState('networkidle');

  // Choose portal
  await page.locator('button:has-text("مزود الخدمة")').click();
  await page.waitForURL((url) => url.href.startsWith(SSO_URL), { timeout: 20_000 });
  await page.waitForLoadState('domcontentloaded');

  // Click Nafath on SSO
  await page.locator('a:has-text("Nafath"), button:has-text("Nafath")').click();
  await page.waitForURL((url) => url.href.startsWith(MOCK_NAFATH_URL), { timeout: 20_000 });
  await page.waitForLoadState('domcontentloaded');

  await completeNafathMockLogin(page, user);
}

/**
 * Logs in as a Purchasing Department user via /login test-users panel.
 * Uses مدير النظام (superadmin) which has full portal access including PD views.
 *
 * NOTE: Update the role name below if a dedicated PD test user is added.
 */
/**
 * Logs in as a Purchasing Department user via:
 *   /nafath-login → الأفراد → Keycloak SSO (username/password) → portal PD view
 *
 * The SSO page accepts both Nafath and username/password.
 * superadmin@infath.sa is configured with PD role in Keycloak.
 */
export async function loginAsPurchasingDept(page: Page): Promise<void> {
  // PD users log in via the direct /login page (email + password), not Nafath
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"], input[id="email"]', PD_USER.email);
  await page.fill('input[type="password"], input[name="password"], input[id="password"]', PD_USER.password);

  await Promise.all([
    page.waitForURL((url) => !url.href.includes('/login'), { timeout: 20_000 }),
    page.locator('button[type="submit"], button:has-text("تسجيل الدخول")').first().click(),
  ]);

  await page.waitForLoadState('networkidle');
}

/**
 * Legacy: logs in as super admin via the /login test users panel.
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  await loginAsPurchasingDept(page);
}

/**
 * Legacy: logs in with direct email/password credentials.
 */
export async function loginWithCredentials(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill(SUPER_ADMIN.email);
  await page.locator('input[type="password"]').fill(SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 });
}
