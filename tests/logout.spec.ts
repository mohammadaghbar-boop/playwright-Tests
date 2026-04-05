import { test, expect } from '@playwright/test';

test('logout', async ({ page }) => {
  // ── Step 1: Navigate and open login ──────────────────────────────────────
  await page.goto('https://qa-infath-app.azm-dev.com/home');
  await page.getByRole('button', { name: 'Login تسجيل الدخول' }).click();
  await page.getByText('المزاود للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();
  await page.getByText('حساب فردي للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();

  await page.getByRole('textbox', { name: 'Username or email' }).fill('12345');
  await page.getByRole('link', { name: 'Nafath' }).click();

  // ── Step 2: Pick a mock user and complete Nafath login ────────────────────
  await page.getByRole('button', { name: 'Mock Users' }).click();

  const users = page.getByRole('button', { name: 'اختيار' });
  await users.first().waitFor({ state: 'visible' });
  const count = await users.count();

  for (let i = 0; i < count; i++) {
    await users.nth(i).click();
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    const result = await Promise.race([
      page.waitForURL('**/home', { timeout: 100000 }).then(() => 'success'),
      page.getByText('An active login request already exists').waitFor({ timeout: 100000 }).then(() => 'error'),
    ]);

    if (result === 'success') break;

    await page.getByRole('button', { name: 'Mock Users' }).click();
  }

  await page.waitForURL('https://qa-infath-app.azm-dev.com/home');
  await expect(page).toHaveURL('https://qa-infath-app.azm-dev.com/home');

  // ── Step 3: Open profile menu ─────────────────────────────────────────────
  const profile = page.locator('div.bg-neutral-100');
  await profile.first().waitFor({ state: 'visible' });
  await profile.first().click();

  // ── Step 4: Click logout ──────────────────────────────────────────────────
  const logoutButton = page.getByRole('button', { name: 'تسجيل خروج' });
  await logoutButton.waitFor({ state: 'visible', timeout: 10000 });
  await logoutButton.click();

  // ── Step 5: Verify redirect to home / login page ──────────────────────────
  await page.waitForURL('https://qa-infath-app.azm-dev.com/home', { timeout: 15000 });
  await expect(page).toHaveURL('https://qa-infath-app.azm-dev.com/home');

  // Login button should be visible again – confirms the session was cleared
  await expect(
    page.getByRole('button', { name: 'Login تسجيل الدخول' })
  ).toBeVisible({ timeout: 10000 });
});
