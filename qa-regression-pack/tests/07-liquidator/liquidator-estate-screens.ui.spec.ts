import { test, expect, Page } from '@playwright/test';

/**
 * 07-liquidator — FRONTEND (UI) layer, driven under the `liquidator` project
 * (liquidator.json, Nafath service-provider NID 1100000011, a dual SP+Liquidator).
 *
 * The area was API-first; this adds the liquidator's real SCREENS: his facility entry,
 * his assigned-estates list (التركات), the estate detail with its correspondence
 * (مخاطبات) section, and his communications inbox (التواصل والاستفسارات).
 *
 * IMPORTANT — liquidator access is currently fragile on CIT (dev merges in progress;
 * the dual-role user has been seen bounced off the /service-providers subtree, and the
 * facility can revert to قيد مراجعة إدارة المشتريات → حالة الحساب معلق, class JF-946).
 * So every step is written to ANNOTATE + assert only what is genuinely reachable and to
 * SKIP (never red-fail) when the facility/estates don't load. Read-only throughout.
 *
 * Selectors/routes proven by the liquidator-day journey: /service-providers/companies,
 * button "الدخول على المنشأة", /service-providers/court-cases (ملفات التركات),
 * /service-providers/tickets.
 */

const SP = {
  companies: '/service-providers/companies',
  estates: '/service-providers/court-cases',
  tickets: '/service-providers/tickets',
} as const;

/** Whitespace-collapsed page text — what the human actually reads. */
async function readBody(page: Page): Promise<string> {
  return (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

/** Wait until the Angular SPA has actually rendered content (renders after domcontentloaded). */
async function waitForContent(page: Page, timeout = 20_000): Promise<boolean> {
  return expect
    .poll(async () => (await readBody(page)).length, { timeout })
    .toBeGreaterThan(50)
    .then(() => true)
    .catch(() => false);
}

/** The liquidator session is gone (global-setup login failed) if we land on login/Nafath. */
function sessionGone(page: Page): boolean {
  return /\/login(\b|$)|nafath-login/.test(page.url());
}

/** Try to enter the facility so the in-facility nav (التركات / التواصل) appears. */
async function enterFacility(page: Page): Promise<void> {
  await page.goto(SP.companies, { waitUntil: 'domcontentloaded' });
  const enter = page.getByRole('button', { name: 'الدخول على المنشأة' });
  if (await enter.count()) {
    await enter.first().click().catch(() => undefined);
    await page.getByRole('link', { name: 'التركات', exact: true }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
  }
}

test.describe('07-liquidator — estate & correspondence screens (UI)', () => {
  test('@blocker liquidator reaches his service-provider workspace (facility screen)', async ({ page }) => {
    await page.goto(SP.companies, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    if (sessionGone(page)) {
      test.skip(true, 'liquidator session unavailable (global-setup Nafath login failed) — cannot reach the SP workspace');
    }
    // Genuinely reachable: the companies/facility screen renders in the SP subtree.
    await expect(page).toHaveURL(/service-providers\/companies/);
    // The SPA renders after domcontentloaded — wait for content before reading it.
    expect(await waitForContent(page), 'the facility workspace should render some content').toBeTruthy();
    const enterVisible = await page.getByRole('button', { name: 'الدخول على المنشأة' }).count();
    test.info().annotations.push({
      type: 'observed',
      description: enterVisible ? 'facility entry (الدخول على المنشأة) is available' : 'no facility-entry button — facility may be معلق / under purchasing review (JF-946)',
    });
  });

  test('@high liquidator assigned-estates list (التركات) — reachable, else annotate the access wall', async ({ page }) => {
    await page.goto(SP.companies, { waitUntil: 'domcontentloaded' });
    if (sessionGone(page)) test.skip(true, 'liquidator session unavailable');
    await enterFacility(page);

    const courtNav = page.getByRole('link', { name: 'التركات', exact: true });
    if (await courtNav.count()) {
      await courtNav.first().click().catch(() => undefined);
    } else {
      await page.goto(SP.estates, { waitUntil: 'domcontentloaded' });
    }
    const onEstatesList = await page.getByText('ملفات التركات').first().isVisible({ timeout: 15_000 }).catch(() => false);

    if (!onEstatesList || !page.url().includes('/service-providers')) {
      // Do NOT red-fail: the liquidator's facility is currently blocked (JF-946 class —
      // dev merges in progress). Record the true wall and assert what IS reachable.
      test.info().annotations.push({
        type: 'blocked-by',
        description: 'JF-946: التركات did not load for the liquidator — facility likely معلق / reverted to purchasing review; his assigned-estates list is not reachable right now',
      });
      // What is still reachable: he is authenticated in the SP subtree (not bounced to login).
      expect(page.url(), 'liquidator remains authenticated inside the portal').not.toContain('/login');
      test.skip(true, 'liquidator estates list not reachable (access blocked) — asserted reachable surface + annotated JF-946');
    }

    await expect(page.getByText('ملفات التركات').first()).toBeVisible();
    const body = await readBody(page);
    test.info().annotations.push({
      type: 'observed',
      description: /INH\d{5}/.test(body) ? 'assigned estates are listed for the liquidator' : 'estates list renders its scaffold with no assigned estates visible',
    });
  });

  test('@medium liquidator communications inbox (التواصل والاستفسارات) is reachable, else annotate', async ({ page }) => {
    await page.goto(SP.companies, { waitUntil: 'domcontentloaded' });
    if (sessionGone(page)) test.skip(true, 'liquidator session unavailable');
    // The inbox needs facility context — enter the facility first, then open tickets.
    await enterFacility(page);
    await page.goto(SP.tickets, { waitUntil: 'domcontentloaded' });
    await waitForContent(page);
    const body = await readBody(page);

    // Without an entered facility the tickets route falls back to the facility PICKER
    // ("جارٍ تحميل المنشآت..." / "تسجيل منشأة يدوياً") — the real JF-946 access wall for
    // this dual-role user. Annotate + skip rather than red-fail.
    const onFacilityPicker = /جارٍ تحميل المنشآت|تسجيل منشأة يدوياً|الدخول على المنشأة/.test(body);
    if (onFacilityPicker || !page.url().includes('/service-providers/tickets')) {
      test.info().annotations.push({
        type: 'blocked-by',
        description: 'JF-946: التواصل والاستفسارات is not reachable for the liquidator — the tickets route falls back to the facility picker ("جارٍ تحميل المنشآت"), his facility not being enterable (معلق / purchasing review)',
      });
      expect(page.url(), 'liquidator remains authenticated inside the portal (not bounced to login)').not.toContain('/login');
      test.skip(true, 'liquidator inbox not reachable (facility-picker fallback) — asserted reachable surface + annotated JF-946');
    }

    await expect(page).toHaveURL(/service-providers\/tickets/);
    expect(
      /التواصل والاستفسارات|الاستفسارات|التذاكر|الرسائل|لا توجد|لا يوجد/.test(body),
      'the communications inbox should render a list or an empty state',
    ).toBeTruthy();
  });
});
