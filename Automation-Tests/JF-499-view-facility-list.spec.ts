/**
 * JF-499 — View Facility List (Purchasing Department)
 *
 * Story: As a Purchasing Department user, I want to view the Service Providers
 * List so that I can manage and review registered facilities and their services.
 *
 * Login URL: https://d-infath-jf-portal.azm-cit.com/nafath-login
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsServiceProvider } from './helpers/auth';
import * as path from 'path';

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';
const SERVICE_PROVIDERS_URL = `${BASE_URL}/service-providers-list`;

// ── Selectors ──────────────────────────────────────────────────────────────────

const SEL = {
  // Side menu
  sideMenuServiceProviders: 'a:has-text("قائمة مزودي الخدمة")',

  // Tabs — buttons with teal border when active
  tabFacilities: 'button:has-text("قائمة المنشآت")',
  tabServices: 'button:has-text("الخدمات")',

  // Facilities table columns
  colFacilityName: 'th:has-text("اسم المنشأة")',
  colUnifiedNum: 'th:has-text("الرقم الوطني الموحد")',
  colAccountStatus: 'th:has-text("حالة الحساب")',
  colServicesCount: 'th:has-text("عدد الخدمات")',
  colViewDetails: 'th:has-text("عرض التفاصيل")',

  // Services table columns
  colSvcFacilityName: 'th:has-text("اسم المنشأة")',
  colSvcUnifiedNum: 'th:has-text("الرقم الوطني الموحد")',
  colSvcType: 'th:has-text("نوع الخدمة")',
  colSvcSubType: 'th:has-text("النوع الفرعي")',
  colSvcClassification: 'th:has-text("التصنيف")',
  colSvcStatus: 'th:has-text("الحالة")',
  colSvcLastUpdated: 'th:has-text("تاريخ آخر تحديث")',
  colSvcViewDetails: 'th:has-text("عرض التفاصيل")',

  // Filters — Facilities tab (actual placeholders from page inspection)
  filterFacilityName: 'input[placeholder="بحث بالاسم"]',
  filterUnifiedNum: 'input[placeholder="الرقم الوطني الموحد"]',
  filterAccountStatus: 'text=كل الحالات',  // Custom PrimeNG/Angular dropdown

  // Table rows
  tableRow: 'tbody tr',
  emptyState: 'text=لا توجد بيانات, text=لا يوجد',
  errorMsg: '.error-message, [role="alert"], .toast-error',
};

// ── Fixtures ───────────────────────────────────────────────────────────────────

test.use({ storageState: path.join(__dirname, '..', '.auth', 'pd.json') });

test.beforeEach(async ({ page }) => {
  await page.goto(SERVICE_PROVIDERS_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1: Navigation & Tabs
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-499 | Navigation & Tabs', () => {

  test('TC-001 | Purchasing Department can access Service Providers List from side menu', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    await page.locator(SEL.sideMenuServiceProviders).first().click();
    await expect(page).toHaveURL(/service-providers-list/);
    await expect(page.locator(SEL.tabFacilities)).toBeVisible();
    await expect(page.locator(SEL.tabServices)).toBeVisible();
  });

  test('TC-002 | Facilities List tab is the default active tab', async ({ page }) => {
    const facilitiesTab = page.locator(SEL.tabFacilities);
    // Active tab has border-teal-500 class (Tailwind)
    const cls = (await facilitiesTab.getAttribute('class')) ?? '';
    expect(cls.includes('border-teal') || cls.includes('active') || cls.includes('text-teal')).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2: Facilities List Tab — Columns & Sorting
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-499 | Facilities List Tab', () => {

  test('TC-003 | Facilities List table displays all 5 required columns', async ({ page }) => {
    await expect(page.locator(SEL.colFacilityName)).toBeVisible();
    await expect(page.locator(SEL.colUnifiedNum)).toBeVisible();
    await expect(page.locator(SEL.colAccountStatus)).toBeVisible();
    await expect(page.locator(SEL.colServicesCount)).toBeVisible();
    await expect(page.locator(SEL.colViewDetails)).toBeVisible();
  });

  test('TC-004 | Facilities with قيد مراجعة إدارة المشتريات status are displayed in the list', async ({ page }) => {
    // Real data shows pending facilities — verify at least one row has the expected status
    await page.waitForSelector('tbody tr', { timeout: 10_000 });
    const pendingRows = page.locator('tbody tr').filter({ hasText: 'قيد مراجعة إدارة المشتريات' });
    await expect(pendingRows.first()).toBeVisible();
  });

  test('TC-010 | Facilities list shows data rows when facilities exist', async ({ page }) => {
    // Real environment has registered facilities — verify table renders data
    await page.waitForSelector('tbody tr', { timeout: 10_000 });
    const count = await page.locator(SEL.tableRow).count();
    expect(count).toBeGreaterThan(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3: Filters — Facilities Tab
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-499 | Facilities Filters', () => {

  test('TC-005 | Facility name filter narrows results — no-match term yields empty state', async ({ page }) => {
    await page.waitForSelector(SEL.tableRow, { timeout: 10_000 });
    const baselineCount = await page.locator(SEL.tableRow).count();
    expect(baselineCount).toBeGreaterThan(0);

    const filterInput = page.locator(SEL.filterFacilityName);
    await expect(filterInput).toBeVisible();

    // Searching for a known Arabic term that exists in real data — result count must be ≤ baseline
    await filterInput.fill('مؤسسة');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const countAfterArabic = await page.locator(SEL.tableRow).count();
    expect(countAfterArabic).toBeLessThanOrEqual(baselineCount);

    // A term guaranteed not to exist — must show 0 data rows or an explicit empty-state message
    await filterInput.clear();
    await filterInput.fill('XXXXNOTFOUND9999');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const bodyText = await page.locator('body').innerText();
    const countAfterNoMatch = await page.locator(SEL.tableRow).count();
    const hasEmptyState = bodyText.includes('لا توجد') || bodyText.includes('لا يوجد') || countAfterNoMatch === 0;
    expect(hasEmptyState).toBeTruthy();
  });

  test('TC-006 | Unified number filter narrows results to matching facility only', async ({ page }) => {
    await page.waitForSelector(SEL.tableRow, { timeout: 10_000 });
    const baselineCount = await page.locator(SEL.tableRow).count();
    expect(baselineCount).toBeGreaterThan(0);

    const input = page.locator(SEL.filterUnifiedNum);
    await expect(input).toBeVisible();

    // Type a real unified number from the test environment
    await input.fill('7100445872');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const countAfterFilter = await page.locator(SEL.tableRow).count();

    // Filter must narrow the result — either exactly 1 row or fewer than baseline
    expect(countAfterFilter).toBeLessThan(baselineCount);

    // The matching row must contain the searched number
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('7100445872');
  });

  test('TC-007 | حالة الحساب status filter is present with default value كل الحالات', async ({ page }) => {
    // Verify the status filter shows its default label
    await expect(page.locator(SEL.filterAccountStatus)).toBeVisible();
  });

  test('TC-013 | Special character filter does not crash the page and shows 0 results or empty state', async ({ page }) => {
    await page.waitForSelector(SEL.tableRow, { timeout: 10_000 });
    const baselineCount = await page.locator(SEL.tableRow).count();
    expect(baselineCount).toBeGreaterThan(0);

    await page.locator(SEL.filterFacilityName).fill('@#$%');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Page must not show an unhandled error
    const errorToast = page.locator('.p-message-error, .toast-error');
    await expect(errorToast).toHaveCount(0);

    // Must return 0 real data rows OR show an explicit empty-state message
    const countAfter = await page.locator(SEL.tableRow).count();
    const bodyText = await page.locator('body').innerText();
    const noResults = countAfter === 0 || bodyText.includes('لا توجد') || bodyText.includes('لا يوجد');
    expect(noResults).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4: Services Tab
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-499 | Services Tab', () => {

  test.beforeEach(async ({ page }) => {
    await page.locator(SEL.tabServices).click();
    await page.waitForTimeout(500);
  });

  test('TC-008 | Services tab displays all 8 required columns', async ({ page }) => {
    await expect(page.locator(SEL.colSvcFacilityName)).toBeVisible();
    await expect(page.locator(SEL.colSvcUnifiedNum)).toBeVisible();
    await expect(page.locator(SEL.colSvcType)).toBeVisible();
    await expect(page.locator(SEL.colSvcSubType)).toBeVisible();
    await expect(page.locator(SEL.colSvcClassification)).toBeVisible();
    await expect(page.locator(SEL.colSvcStatus)).toBeVisible();
    await expect(page.locator(SEL.colSvcLastUpdated)).toBeVisible();
    await expect(page.locator(SEL.colSvcViewDetails)).toBeVisible();
  });

  test('TC-009 | Services tab shows قيد مراجعة services before مفعل and مرفوضة', async ({ page }) => {
    const rows = page.locator(SEL.tableRow);
    const count = await rows.count();
    if (count === 0) return; // No services in environment — nothing to sort

    // Collect status text from each row in rendered order
    const statuses: string[] = [];
    for (let i = 0; i < count; i++) {
      statuses.push(await rows.nth(i).innerText());
    }

    // Find index of first قيد مراجعة row and first non-pending (مفعل / مرفوضة) row
    const firstPendingIdx = statuses.findIndex(t => t.includes('قيد المراجعة') || t.includes('قيد مراجعة'));
    const firstActivatedIdx = statuses.findIndex(t => t.includes('مفعل') || t.includes('مرفوضة'));

    if (firstPendingIdx !== -1 && firstActivatedIdx !== -1) {
      // All pending rows must appear before any activated/rejected row
      expect(firstPendingIdx).toBeLessThan(firstActivatedIdx);
    } else {
      // Only one status type present — ordering constraint does not apply
      expect(count).toBeGreaterThan(0);
    }
  });

  test('TC-011 | Services tab loads without error after switching from Facilities tab', async ({ page }) => {
    // No error alert or toast must be visible
    const errorLocator = page.locator('[role="alert"].error, .toast-error, .p-message-error');
    await expect(errorLocator).toHaveCount(0);

    // Either data rows or an explicit empty-state message must be present — not a blank page
    const rowCount = await page.locator(SEL.tableRow).count();
    const bodyText = await page.locator('body').innerText();
    const hasContent = rowCount > 0 || bodyText.includes('لا توجد') || bodyText.includes('لا يوجد');
    expect(hasContent).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 5: Access Control
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-499 | Access Control', () => {

  test('TC-012 | Non-Purchasing Department (SP) role is redirected away from Service Providers List', async ({ browser }) => {
    // SP auth navigating to /service-providers-list should redirect to nafath-login (not a PD page)
    const ctx = await browser.newContext({ storageState: path.join(__dirname, '..', '.auth', 'sp.json') });
    const page = await ctx.newPage();
    await page.goto(SERVICE_PROVIDERS_URL);
    await page.waitForLoadState('networkidle');
    const url = page.url();
    // SP gets redirected — URL should NOT stay on service-providers-list
    const isRedirected = !url.includes('service-providers-list') || url.includes('login') || url.includes('nafath');
    await ctx.close();
    expect(isRedirected).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 6: Empty States
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-499 | Empty States', () => {

  test('TC-2555 | Empty state displayed when no facilities exist in Facilities List tab', async ({ page }) => {
    await page.route(
      (url) => url.href.includes('azm-cit.com') && !url.href.includes('services') && !url.href.includes('.js') && !url.href.includes('.css'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ data: [], items: [], totalCount: 0 }),
          });
        } else {
          await route.continue();
        }
      }
    );
    await page.reload();
    await page.waitForLoadState('networkidle');
    // With empty data, either an empty-state message appears or the table has 0 rows
    const rowCount = await page.locator('tbody tr').count();
    const bodyText = await page.locator('body').innerText();
    const hasEmptyState = rowCount === 0 || bodyText.includes('لا توجد') || bodyText.includes('لا يوجد') || bodyText.includes('No data') || bodyText.includes('empty');
    expect(hasEmptyState).toBeTruthy();
  });

  test('TC-2556 | Empty state displayed when no services exist in Services tab', async ({ page }) => {
    await page.route(
      (url) => url.href.includes('services'),
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ data: [], items: [], totalCount: 0 }),
          });
        } else {
          await route.continue();
        }
      }
    );
    // Switch to Services tab
    const servicesTab = page.locator('button:has-text("الخدمات"), [role="tab"]:has-text("الخدمات")').first();
    await servicesTab.click();
    await page.waitForTimeout(500);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.includes('لا توجد') || bodyText.includes('لا يوجد')).toBeTruthy();
  });

});
