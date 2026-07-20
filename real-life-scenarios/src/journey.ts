import { Page, expect, test, APIRequestContext, request as pwRequest } from '@playwright/test';
import { Persona } from './personas';
import { URLS, KNOWN_BLOCKERS } from './world';

/**
 * Journey helpers — the shared vocabulary every real-life journey is written in.
 *
 * A journey reads like a story: a sequence of `step(...)` blocks (rendered in the
 * Playwright report as named steps), each asserting what the real user would see.
 * When a step is blocked by a KNOWN open bug, use `blockedStep(...)` so the journey
 * records the real user's actual wall (with the JF key) and stops gracefully rather
 * than failing as if it were a new regression.
 */

/** A named journey step. Wraps test.step so the HTML report reads like a user flow. */
export async function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  return test.step(title, body);
}

/**
 * Record that a real user hits a wall here because of a known open bug, annotate the
 * journey with the JF key, and stop the journey cleanly (skip the rest). Use this so a
 * journey documents the true end-user experience instead of red-failing on a tracked bug.
 */
export function blockedHere(jfKey: string, whatTheUserSees: string): never {
  const detail = KNOWN_BLOCKERS[jfKey] ?? jfKey;
  test.info().annotations.push({ type: 'blocked-by', description: `${jfKey}: ${detail}` });
  test.skip(true, `Real user blocked here by ${jfKey} — ${whatTheUserSees}`);
  // test.skip throws; unreachable, but keeps the return type honest.
  throw new Error('unreachable');
}

/** Wait out the SPA's /login-callback code exchange after any SSO login. */
async function settleAfterLogin(page: Page): Promise<void> {
  await page.waitForURL(`${URLS.portal}/**`, { timeout: 45_000 });
  await expect
    .poll(() => (page.url().includes('login-callback') ? 'pending' : 'done'), { timeout: 30_000 })
    .toBe('done');
}

/** Internal portal login (email + password) — estate/relationship managers. */
export async function loginInternal(page: Page, email: string, password: string): Promise<void> {
  await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"], input#email').first().fill(email);
  await page.locator('input[type="password"], input[name="password"], input#password').first().fill(password);
  await Promise.all([
    page.waitForURL((u) => !u.href.includes('/login'), { timeout: 30_000 }),
    page.locator('button[type="submit"], button:has-text("تسجيل الدخول")').first().click(),
  ]);
}

/** Demo-users panel login (for the SystemAdmin/Purchasing account whose password isn't shared). */
export async function loginDemoPanel(page: Page, email: string): Promise<void> {
  await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('button:has-text("مستخدمين تجريبيين")').click();
  const idx = await page.evaluate((em) => {
    // Boundary-aware email match so e.g. "admin@infath.sa" does NOT match the
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
  await page.waitForURL((u) => !u.href.includes('/login'), { timeout: 30_000 }).catch(() => undefined);
}

/**
 * Nafath-mock login. portalChoice: "مزود الخدمة" (service provider / liquidator) or
 * "الأفراد" (individuals / heir). Handles the mock's "active login request already
 * exists" collision with a wait-and-retry.
 */
export async function loginNafath(page: Page, nationalId: string, portalChoice: string): Promise<void> {
  await page.goto(`${URLS.portal}/nafath-login`, { waitUntil: 'domcontentloaded' });
  await page.locator(`button:has-text("${portalChoice}")`).click({ timeout: 30_000 });
  await page.waitForURL((u) => u.href.startsWith(URLS.sso), { timeout: 30_000 });
  await page.locator('a:has-text("Nafath"), button:has-text("Nafath")').first().click({ timeout: 30_000 });
  await page.waitForURL((u) => u.href.startsWith(URLS.nafathMock), { timeout: 30_000 });
  await page.locator('#btnToggleUsers, button:has-text("Mock Users")').first().click({ timeout: 20_000 });
  const userBtn = page.locator(`button[data-fill="${nationalId}"]`).first();
  await userBtn.waitFor({ timeout: 20_000 });
  await userBtn.click({ force: true });
  for (let attempt = 0; attempt < 3; attempt++) {
    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    if (/active login request already exists|طلب.*موجود/i.test(body)) {
      await page.waitForTimeout(60_000);
    }
    await page.locator('#btnStartNafath, button:has-text("تسجيل الدخول")').first().click({ force: true }).catch(() => undefined);
    const t0 = Date.now();
    while (Date.now() - t0 < 25_000 && !page.url().startsWith(URLS.portal)) await page.waitForTimeout(1000);
    if (page.url().startsWith(URLS.portal)) break;
  }
  await settleAfterLogin(page);
}

/** Read the latest 4-digit registration OTP for a mobile from the SMS mock. */
export async function readRegistrationOtp(ctx: APIRequestContext, intlMobile: string, sinceMs: number): Promise<string | null> {
  for (let i = 0; i < 20; i++) {
    const res = await ctx.get(`${URLS.smsMock}/api/notifications`);
    const list: Array<{ type: string; to: string; message: string; timestamp: string }> = await res.json().catch(() => []);
    const hit = list.find(
      (n) => n.type === 'sms' && n.to === intlMobile && new Date(n.timestamp).getTime() >= sinceMs - 3000 && /\d{4}/.test(n.message),
    );
    if (hit) return (hit.message.match(/هو\s*(\d{4})/) || hit.message.match(/(\d{4})/))?.[1] ?? null;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

/** Dispatch login for any persona by its declared login method. */
export async function loginAs(page: Page, persona: Persona): Promise<void> {
  switch (persona.loginMethod) {
    case 'internal':
      return loginInternal(page, persona.email!, persona.password!);
    case 'demo-panel':
      return loginDemoPanel(page, persona.email!);
    case 'nafath-serviceprovider':
      return loginNafath(page, persona.nationalId!, 'مزود الخدمة');
    case 'nafath-individual':
      return loginNafath(page, persona.nationalId!, 'الأفراد');
    case 'none':
      return; // public — no login
  }
}

/** A standalone API context (for reading the SMS mock, etc.). */
export function apiContext(): Promise<APIRequestContext> {
  return pwRequest.newContext({ ignoreHTTPSErrors: true });
}
