import { test, expect } from '@playwright/test';

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';
const SERVICES_URL = `${BASE_URL}/service-providers/services`;

// Uses storageState saved by auth.setup.ts — no login needed.
// Eye icon: <a aria-label="عرض التفاصيل"> routerLink to /service-providers/services/:id

async function waitForServicesPage(page: any) {
  // Retry once on transient network errors (ERR_NETWORK_CHANGED, ERR_ABORTED)
  try {
    await page.goto(SERVICES_URL);
  } catch {
    await page.waitForTimeout(2000);
    await page.goto(SERVICES_URL);
  }
  await page.waitForLoadState('networkidle');
  // Wait for EITHER rows (eye icon) OR the no-services empty state
  await Promise.race([
    page.getByRole('link', { name: 'عرض التفاصيل' }).first()
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
    page.locator('text=لا توجد خدمات مسجلة لهذه المنشأة')
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
  ]);
}

async function hasRows(page: any): Promise<boolean> {
  return page.getByRole('link', { name: 'عرض التفاصيل' }).first().isVisible();
}

test.describe('Service Details', () => {
  test.beforeEach(async ({ page }) => {
    await waitForServicesPage(page);
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  test('JF-TC-SD-01 - Eye icon is visible on first row', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await expect(page.getByRole('link', { name: 'عرض التفاصيل' }).first()).toBeVisible();
  });

  test('JF-TC-SD-02 - Clicking eye icon navigates to service detail URL', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForURL(/\/service-providers\/services\/[\w-]+$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/service-providers\/services\/[\w-]+$/);
  });

  // ── Page structure ──────────────────────────────────────────────────────────

  test('JF-TC-SD-03 - Service detail page shows correct title تفاصيل الخدمة', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'تفاصيل الخدمة' })).toBeVisible();
  });

  test('JF-TC-SD-04 - Back link العودة للقائمة is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('back-link')).toBeVisible();
    await expect(page.getByTestId('back-link')).toContainText('العودة للقائمة');
  });

  test('JF-TC-SD-05 - Status badge is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('status-badge')).toBeVisible();
  });

  test('JF-TC-SD-06 - Submitted-by and submitted-at meta fields are visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('submitted-by')).toBeVisible();
    await expect(page.getByTestId('submitted-at')).toBeVisible();
  });

  // ── Content sections ────────────────────────────────────────────────────────

  test('JF-TC-SD-07 - Section الإفصاح is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'الإفصاح' })).toBeVisible();
  });

  test('JF-TC-SD-08 - Section البيانات العامة is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'البيانات العامة' })).toBeVisible();
  });

  test('JF-TC-SD-09 - Section السجل التجاري is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'السجل التجاري' })).toBeVisible();
  });

  test('JF-TC-SD-10 - Section الشهادات الرسمية is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'الشهادات الرسمية' })).toBeVisible();
  });

  test('JF-TC-SD-11 - Section التراخيص is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'التراخيص' })).toBeVisible();
  });

  test('JF-TC-SD-12 - Section الخبرات is visible', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'الخبرات' })).toBeVisible();
  });

  // ── Back navigation ─────────────────────────────────────────────────────────

  test('JF-TC-SD-13 - Back link navigates back to services list', async ({ page }) => {
    test.skip(!await hasRows(page), 'No services registered for this facility');
    await page.getByRole('link', { name: 'عرض التفاصيل' }).first().click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('back-link').click();
    await page.waitForURL(/\/service-providers\/services$/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/service-providers\/services$/);
    await expect(page.locator('text=قائمة الخدمات')).toBeVisible();
  });

  // ── Empty state (always runs) ───────────────────────────────────────────────

  test('JF-TC-SD-14 - Services page shows title قائمة الخدمات regardless of data', async ({ page }) => {
    await expect(page.locator('text=قائمة الخدمات')).toBeVisible();
  });

  test('JF-TC-SD-15 - Empty state shows correct message when no services exist', async ({ page }) => {
    test.skip(await hasRows(page), 'Facility has services — empty state not shown');
    await expect(page.locator('text=لا توجد خدمات مسجلة لهذه المنشأة')).toBeVisible();
  });
});
