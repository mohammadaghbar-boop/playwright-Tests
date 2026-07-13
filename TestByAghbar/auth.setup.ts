import { test as setup } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

setup('authenticate and select facility', async ({ page }) => {
  await page.goto(`${BASE_URL}/nafath-login`);
  await page.getByTestId('portal-card-service-providers').click();
  await page.getByRole('link', { name: 'Nafath' }).click();
  await page.getByRole('button', { name: 'Mock Users' }).click();
  // Select Mohammed ALGHAMDI (ID: 1084039435) — this facility has registered services
  await page.locator(':text("1084039435")').locator('..').locator('..').getByRole('button', { name: 'اختيار' }).click();
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  // The Nafath mock OIDC page (oidc-login.html) auto-approves within ~10 s and then
  // redirects back through Keycloak to the portal.  During this multi-hop redirect
  // chain Playwright throws ERR_ABORTED on the intermediate frames.  Catch it and
  // wait for the final landing — do NOT throw immediately; the redirect is still in flight.
  try {
    await page.waitForURL('**/service-providers/**', { timeout: 90000 });
  } catch {
    // Still on oidc-login.html (auto-approval in progress) or mid-redirect.
    // Give the auto-approval up to 30 more seconds to complete.
    await page.waitForURL('**/service-providers/**', { timeout: 30000 });
  }
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'الدخول على المنشأة' }).first().click();
  await page.waitForLoadState('networkidle');

  // Navigate to services page so the facilitySelectedGuard + SelectedFacilityService
  // fully hydrate before we snapshot state. Without this, fresh pages using this
  // storageState see facilityId()=null on first load and load() exits early.
  await page.goto(`${BASE_URL}/service-providers/services`);
  await page.waitForLoadState('networkidle');

  // Wait for the page to settle: either rows or empty state is acceptable
  await Promise.race([
    page.getByRole('link', { name: 'عرض التفاصيل' }).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    page.locator('text=لا توجد خدمات مسجلة لهذه المنشأة').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);

  await page.context().storageState({ path: AUTH_FILE });
});
