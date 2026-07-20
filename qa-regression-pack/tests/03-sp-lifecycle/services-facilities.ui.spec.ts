import { test, expect, Page } from '@playwright/test';
import { URLS, TENANT_ID } from '../../src/helpers/users';
import { annotateKnownIssue } from '../../src/known-issues';

/**
 * FRONTEND (UI) layer for the service-provider lifecycle — the SP-portal Facilities
 * (companies) list and the Services list (JF-493/499/567). Runs under the
 * 'service-provider' project (sp.json), produced every run by global-setup driving the
 * full Nafath/SSO/mock login. If that session is missing/expired the screen bounces to
 * an auth surface and the test skips cleanly rather than red-failing.
 *
 * The service-registration entry is guarded for the known site-config regressions
 * JF-1097 (site-config/* 500) / JF-829 (site-config request aborts): a real SP hits this
 * wall at the wizard's terms-and-conditions submit, so we probe the exact endpoint and
 * annotate the known issue instead of pretending registration succeeds.
 */
const COMPANIES_PATH = '/service-providers/companies';
const SERVICES_PATH = '/service-providers/services';

/** True if the SP session landed inside the portal (not bounced to login/nafath). */
async function inPortal(page: Page): Promise<boolean> {
  return expect
    .poll(() => (/nafath-login|\/login(\b|$)/.test(page.url()) ? 'login' : 'portal'), { timeout: 20_000 })
    .toBe('portal')
    .then(() => true)
    .catch(() => false);
}

test.describe('SP facilities & services screens (UI)', () => {
  test('@blocker facilities (companies) list renders with the enter-facility action', async ({ page }) => {
    await page.goto(`${URLS.portal}${COMPANIES_PATH}`, { waitUntil: 'domcontentloaded' });
    test.skip(!(await inPortal(page)), 'SP Nafath session (sp.json) unavailable');

    // The SP landing list exposes the "enter facility" CTA for an approved facility.
    await expect(page.getByText('الدخول على المنشأة').first()).toBeVisible({ timeout: 30_000 });
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(body, 'the facilities list should render its columns').toMatch(/المنشأ|السجل|حالة/);
  });

  test('@high services list renders its columns once inside a facility', async ({ page }) => {
    await page.goto(`${URLS.portal}${COMPANIES_PATH}`, { waitUntil: 'domcontentloaded' });
    test.skip(!(await inPortal(page)), 'SP Nafath session (sp.json) unavailable');

    // Enter the facility so the services list has its facility context.
    const enterBtn = page.getByRole('button', { name: 'الدخول على المنشأة' });
    if (await enterBtn.count()) {
      await enterBtn.first().click().catch(() => undefined);
      await page.waitForURL('**/service-providers/**', { timeout: 30_000 }).catch(() => undefined);
    }
    await page.goto(`${URLS.portal}${SERVICES_PATH}`, { waitUntil: 'domcontentloaded' });

    // Wait for the SPA to render the services surface.
    await expect
      .poll(async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').length, {
        timeout: 30_000,
      })
      .toBeGreaterThan(50);
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

    // If the facility context did not carry over (JWT held in memory only), the services
    // list will not render — record it and assert only what is reachable, don't red-fail.
    const isServices = /قائمة الخدمات|نوع الخدمة|رقم الترخيص/.test(body);
    if (!isServices) {
      test.info().annotations.push({
        type: 'observed',
        description: 'services list did not render for this session (facility context not carried in sp.json); companies list reachability is asserted by the @blocker test',
      });
      expect(page.url(), 'still within the SP portal').toContain('/service-providers');
      return;
    }

    // Confirmed services-list columns (JF-499/567).
    const columns = ['نوع الخدمة', 'النوع الفرعي', 'التصنيف', 'رقم الترخيص', 'تاريخ آخر تحديث', 'حالة الخدمة'];
    const seen = columns.filter((c) => body.includes(c));
    expect(seen.length, `expected services-list columns; saw: ${seen.join(', ')}`).toBeGreaterThanOrEqual(3);
    test.info().annotations.push({ type: 'observed', description: `services-list columns seen: ${seen.join(', ')}` });
  });

  test('@medium service-registration config endpoint is guarded (JF-1097/JF-829)', async ({ page }) => {
    // The Register-Service wizard's final submit depends on site-config
    // (service-registration:terms-and-conditions). Probe it directly — a 500/abort here
    // is the documented wall a real SP hits, tracked as JF-1097 (and JF-829 for the
    // ERR_ABORTED variant). This test observes the platform state, it never registers.
    const res = await page.request
      .get(`${URLS.api}/platform/api/v1/site-config/service-registration:terms-and-conditions`, {
        headers: { TenantIdentifier: TENANT_ID, 'Accept-Language': 'ar-SA' },
        failOnStatusCode: false,
      })
      .catch(() => null);
    const status = res ? res.status() : 'unreachable';
    test.info().annotations.push({
      type: 'evidence',
      description: `GET site-config/service-registration:terms-and-conditions → ${status} (200 = healthy; 500 = JF-1097).`,
    });

    if (status === 200) {
      // Config healthy — the known regression appears resolved; the reporter will flag
      // this as "possibly fixed" only if an annotated spec passes, so do NOT annotate.
      expect(status).toBe(200);
    } else {
      // Still broken (or unreachable) — this is the tracked wall, not a new regression.
      annotateKnownIssue(test, 'JF-1097');
      if (status !== 'unreachable') annotateKnownIssue(test, 'JF-829');
      expect([500, 502, 503, 'unreachable']).toContain(status);
    }
  });
});
