import { Page, expect, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { PD_USER, URLS, NATIONAL_IDS } from './users';

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
 * Demo-users panel login (for the SystemAdmin/Purchasing account whose password is not
 * shared with the API-login helper). Opens `/login`, expands the "مستخدمين تجريبيين"
 * panel, picks the row for `email` (boundary-aware so admin@ ≠ superadmin@), submits, and
 * waits off the login screen. This is the only reliable way to obtain a **SystemAdmin**
 * browser session on CIT — the admin config screens (task-management, roles, flow-maps)
 * are SystemAdmin-scoped, so the internal EstateManager pd.json session is not authorized
 * for them. Returns void; callers should assert they left /login and `test.skip` cleanly
 * if not (a demo-panel hiccup must not red-fail the pack).
 */
export async function loginDemoPanel(page: Page, email = 'admin@infath.sa'): Promise<void> {
  await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('button:has-text("مستخدمين تجريبيين")').click();
  const idx = await page.evaluate((em) => {
    // Boundary-aware email match so "admin@infath.sa" does NOT match the
    // "superadmin@infath.sa" row (admin@ is a substring of superadmin@).
    const esc = em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|[^A-Za-z0-9._%+-])' + esc + '(?![A-Za-z0-9._%+-])');
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => (b.textContent || '').includes('اختيار'));
    for (let i = 0; i < btns.length; i++) {
      let el: Element | null = btns[i];
      while (el?.parentElement) {
        const p: Element = el.parentElement;
        if (Array.from(p.querySelectorAll('button')).filter((x) => (x.textContent || '').includes('اختيار')).length > 1) break;
        el = p;
      }
      if (re.test(el?.textContent || '')) return i;
    }
    return -1;
  }, email);
  if (idx < 0) throw new Error(`demo-panel row for ${email} not found`);
  await page.locator('button:has-text("اختيار")').nth(idx).click();
  await page.waitForTimeout(1500);
  if (page.url().includes('/login')) {
    await page.locator('button[type="submit"], button:has-text("تسجيل الدخول")').first().click().catch(() => undefined);
  }
  await page.waitForURL((url) => !url.href.includes('/login'), { timeout: 30_000 }).catch(() => undefined);
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
 * Bearer + facility context for LIQUIDATOR-scoped API calls.
 *
 * The external portal keeps its JWT in memory only (never in web storage), and its
 * API calls authenticate with `Authorization` + `x-facility-id` (NO TenantIdentifier)
 * — verified by sniffing the SPA on CIT 2026-07-19. So the only way to drive the
 * liquidator-scoped APIs (correspondence, assignment, in-estate surfaces) is to let
 * the SPA log in, enter the facility, and capture those headers off its own traffic.
 *
 * Reuses the cached `.auth/liquidator.json` session when present (silent SSO
 * re-auth); falls back to a full Nafath-mock login, waiting out the mock's
 * "active login request already exists" collision (it expires in ~60s — the mock
 * rejects concurrent logins per identity). Returns null on any failure so callers
 * can `test.skip` cleanly rather than hard-fail.
 */
export interface LiquidatorApiAuth {
  token: string;
  facilityId: string;
}

export async function captureLiquidatorApiAuth(
  nationalId = NATIONAL_IDS.liquidator,
): Promise<LiquidatorApiAuth | null> {
  const browser = await chromium.launch({ headless: true });
  try {
    const stateFile = path.resolve(__dirname, '..', '..', '.auth', 'liquidator.json');
    const context = await browser.newContext({
      locale: 'ar-SA',
      ignoreHTTPSErrors: true,
      ...(fs.existsSync(stateFile) ? { storageState: stateFile } : {}),
    });
    const page = await context.newPage();
    let token: string | null = null;
    let facilityId: string | null = null;
    page.on('request', (r) => {
      if (!r.url().startsWith(URLS.api)) return;
      const auth = r.headers()['authorization'];
      const fac = r.headers()['x-facility-id'];
      // The facility-scoped token is the one we want — keep overwriting until
      // a request carries both headers (post-facility-entry traffic).
      if (auth?.startsWith('Bearer ') && fac) {
        token = auth.slice(7);
        facilityId = fac;
      }
    });

    await page.goto(`${URLS.portal}/service-providers/companies`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Session gone → full Nafath-mock login (with collision wait).
    if (/nafath-login|\/login\b/.test(page.url())) {
      await page.goto(`${URLS.portal}/nafath-login`);
      await page.locator('button:has-text("مزود الخدمة")').click();
      await page.waitForURL((url) => url.href.startsWith(URLS.sso), { timeout: 30_000 });
      await page.locator('a:has-text("Nafath"), button:has-text("Nafath")').first().click();
      await page.waitForURL((url) => url.href.startsWith(URLS.nafathMock), { timeout: 30_000 });
      await page.locator('#btnToggleUsers, button:has-text("Mock Users")').first().click();
      const userBtn = page.locator(`button[data-fill="${nationalId}"]`).first();
      await userBtn.waitFor({ timeout: 20_000 });
      await userBtn.click({ force: true });
      for (let attempt = 0; attempt < 3; attempt++) {
        const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
        if (/active login request already exists/i.test(body)) await page.waitForTimeout(60_000);
        await page.locator('#btnStartNafath, button:has-text("تسجيل الدخول")').first()
          .click({ force: true }).catch(() => undefined);
        const t0 = Date.now();
        while (Date.now() - t0 < 25_000 && !page.url().startsWith(URLS.portal)) await page.waitForTimeout(1000);
        if (page.url().startsWith(URLS.portal)) break;
      }
      for (let i = 0; i < 30 && page.url().includes('login-callback'); i++) await page.waitForTimeout(1000);
      await page.goto(`${URLS.portal}/service-providers/companies`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    // Enter the facility so subsequent API traffic carries x-facility-id.
    const enterBtn = page.getByRole('button', { name: 'الدخول على المنشأة' });
    if (await enterBtn.count()) {
      await enterBtn.first().click().catch(() => undefined);
      await page.waitForTimeout(3000);
    }
    // Force facility-scoped API calls and wait for the sniffer.
    await page.goto(`${URLS.portal}/service-providers/court-cases`, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
    for (let i = 0; i < 30 && !(token && facilityId); i++) await page.waitForTimeout(1000);
    return token && facilityId ? { token, facilityId } : null;
  } catch {
    return null;
  } finally {
    await browser.close();
  }
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
  const browser = await chromium.launch({ headless: true });
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
