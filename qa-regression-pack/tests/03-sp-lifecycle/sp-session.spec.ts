import { test, expect } from '@playwright/test';
import { URLS } from '../../src/helpers/users';

/**
 * Service-provider session validity — the collision-free SP-auth regression guard.
 * This project's storageState is sp.json, produced by global-setup driving the
 * full Nafath/SSO/mock login every run. If that login breaks, global-setup writes
 * an empty state and this test fails — catching SP authentication regressions
 * without re-triggering a second concurrent Nafath login.
 */
test.describe('Service-provider session', () => {
  test('@blocker SP session is authenticated (Nafath login produced a valid session)', async ({ page }) => {
    await page.goto(`${URLS.portal}/service-providers/companies`);
    // A valid SP session stays in the portal; a broken/empty session bounces to login.
    await expect
      .poll(() => (/nafath-login|\/login(\b|$)/.test(page.url()) ? 'login' : 'portal'), { timeout: 20_000 })
      .toBe('portal');
    await expect(page.locator('body')).toBeVisible();
  });
});
