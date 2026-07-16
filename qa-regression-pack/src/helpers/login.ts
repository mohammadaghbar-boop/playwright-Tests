import { Page, expect, chromium } from '@playwright/test';
import { PD_USER, URLS } from './users';

/**
 * Shared login recipes (single source of truth — every spec/fixture reuses these,
 * per the team's restructure direction: login is a shared function, never inline).
 */

/** Internal portal login (email + password) — PD / admin views. */
export async function loginInternal(page: Page, email = PD_USER.email, password = PD_USER.password): Promise<void> {
  await page.goto(`${URLS.portal}/login`);
  await page.locator('input[type="email"], input[name="email"], input#email').first().fill(email);
  await page.locator('input[type="password"], input[name="password"], input#password').first().fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30_000 }),
    page.locator('button[type="submit"], button:has-text("تسجيل الدخول")').first().click(),
  ]);
}

/**
 * Nafath-mock login for external users (SP / liquidator / heir).
 * portalChoice: the button text on /nafath-login ("مزود الخدمة" or "الأفراد").
 */
export async function loginViaNafath(page: Page, nationalId: string, portalChoice = 'مزود الخدمة'): Promise<void> {
  await page.goto(`${URLS.portal}/nafath-login`);
  await page.locator(`button:has-text("${portalChoice}")`).click();
  await page.waitForURL((url) => url.href.startsWith(URLS.sso), { timeout: 30_000 });
  await page.locator('a:has-text("Nafath"), button:has-text("Nafath")').first().click();
  await page.waitForURL((url) => url.href.startsWith(URLS.nafathMock), { timeout: 30_000 });

  await page.locator('#btnToggleUsers, button:has-text("Mock Users")').first().click();
  const userBtn = page.locator(`button[data-fill="${nationalId}"]`).first();
  await userBtn.waitFor({ timeout: 20_000 });
  await userBtn.click();
  await page.locator('#btnStartNafath, button:has-text("تسجيل الدخول")').first().click();

  await page.waitForURL(`${URLS.portal}/**`, { timeout: 40_000 });
  // The SPA lands on /login-callback while it exchanges the code — wait it out.
  await expect
    .poll(() => (page.url().includes('login-callback') ? 'pending' : 'done'), { timeout: 30_000 })
    .toBe('done');
}

/**
 * Log in through the on-page "مستخدمين تجريبيين" demo-users panel as `email` and
 * return that account's bearer token (scraped from the Authorization header of the
 * first authenticated API call). This is the only reliable way to obtain a
 * **SystemAdmin** session on CIT — its password is not available to the API-login
 * helper, and flow-map / decision-point WRITES are SystemAdmin-scoped (EstateManager
 * is correctly 403'd). Launches its own headless Edge; returns null on any failure so
 * callers can `test.skip` cleanly rather than hard-fail.
 */
export async function captureDemoPanelToken(email = 'admin@infath.sa'): Promise<string | null> {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ locale: 'ar-SA', ignoreHTTPSErrors: true });
    const page = await context.newPage();
    let bearer: string | null = null;
    page.on('request', (r) => {
      const a = r.headers()['authorization'];
      if (a && !bearer && a.startsWith('Bearer ')) bearer = a.slice(7);
    });
    await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('button:has-text("مستخدمين تجريبيين")').click();
    // Each demo row carries one "اختيار" button; find the row whose text holds `email`.
    const idx = await page.evaluate((em) => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) => (b.textContent || '').includes('اختيار'));
      for (let i = 0; i < btns.length; i++) {
        let el: Element | null = btns[i];
        while (el?.parentElement) {
          const p: Element = el.parentElement;
          if (Array.from(p.querySelectorAll('button')).filter((x) => (x.textContent || '').includes('اختيار')).length > 1) break;
          el = p;
        }
        if ((el?.textContent || '').includes(em)) return i;
      }
      return -1;
    }, email);
    if (idx < 0) return null;
    await page.locator('button:has-text("اختيار")').nth(idx).click();
    await page.waitForTimeout(1500);
    // The panel usually auto-submits; if it only fills the form, submit it.
    if (page.url().includes('/login')) {
      await page.locator('button[type="submit"], button:has-text("تسجيل الدخول")').first().click().catch(() => undefined);
    }
    await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30_000 }).catch(() => undefined);
    // Visit an authenticated admin screen to force a bearer-carrying API request.
    await page.goto(`${URLS.portal}/flowchart-management`, { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 30 && !bearer; i++) await page.waitForTimeout(500);
    return bearer;
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}
