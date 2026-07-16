import { test, expect } from '@playwright/test';
import { loginViaNafath } from '../../src/helpers/login';
import { NATIONAL_IDS, URLS } from '../../src/helpers/users';

/**
 * Nafath external authentication — negative path only.
 *
 * The SP happy-path login is exercised every run by global-setup (it drives the
 * full Nafath/SSO flow to produce sp.json) and re-asserted in 03-sp-lifecycle via
 * the SP session. Re-driving it here as a second concurrent login for the SAME
 * identity trips the mock's "active login request already exists" guard, so this
 * file keeps only the blocked-user negative, which uses a distinct identity.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Nafath external authentication', () => {
  test('@high blocked Nafath identity cannot reach the portal (JF-819)', async ({ page }) => {
    // 1115789890 is a seeded Blocked mock identity — login must not land in the app.
    await loginViaNafath(page, NATIONAL_IDS.blockedUser).catch(() => {
      /* the block may abort the redirect entirely — the assertion below holds either way */
    });
    expect(page.url()).not.toMatch(/service-providers|dashboard|court-cases/);
    // Still on an auth surface (login / nafath / sso / mock), not inside the portal.
    expect(page.url()).toMatch(
      new RegExp(`${'login|nafath|sso|' + URLS.nafathMock.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    );
  });
});
