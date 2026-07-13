import { test, expect, Page, BrowserContext } from '@playwright/test';

let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  // Single browser context = single window
  context = await browser.newContext();
  page = await context.newPage();

  // Login ONCE
  await page.goto('https://d-infath-jf-portal.azm-cit.com/nafath-login');
  await page.getByTestId('portal-card-service-providers').click();
  await page.getByRole('link', { name: 'Nafath' }).click();
  await page.getByRole('button', { name: 'Mock Users' }).click();
  await page.getByRole('button', { name: 'اختيار' }).first().click();
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  // Wait for Keycloak redirect
  await page.waitForURL('**/service-providers/**', { timeout: 60000 });
  await page.waitForLoadState('networkidle');

  // Select facility
  await page.getByRole('button', { name: 'الدخول على المنشأة' }).first().click();
  await page.waitForLoadState('networkidle');

  // Navigate to services list
  await page.getByRole('link', { name: 'الخدمات الخدمات' }).click();
  await page.waitForLoadState('networkidle');
});

test.afterAll(async () => {
  await context.close();
});

test.beforeEach(async () => {
  // Navigate back to services list in same tab
  await page.goto('https://d-infath-jf-portal.azm-cit.com/service-providers/services');
  await page.waitForLoadState('networkidle');
});

// JF-TC-2820
test('JF-TC-2820 - Navigate to Services List from side menu', async () => {
  await expect(page.locator('text=قائمة الخدمات')).toBeVisible();
});

// JF-TC-2821
test('JF-TC-2821 - Services list displays correct columns', async () => {
  await expect(page.locator('text=نوع الخدمة').first()).toBeVisible();
  await expect(page.locator('text=النوع الفرعي').first()).toBeVisible();
  await expect(page.locator('text=التصنيف').first()).toBeVisible();
  await expect(page.locator('text=رقم الترخيص').first()).toBeVisible();
  await expect(page.locator('text=تاريخ آخر تحديث').first()).toBeVisible();
  await expect(page.locator('text=حالة الخدمة').first()).toBeVisible();
  await expect(page.locator('text=عرض التفاصيل').first()).toBeVisible();
});

// JF-TC-2825
test('JF-TC-2825 - License number partial search', async () => {
  await page.getByPlaceholder('ابحث برقم الترخيص').fill('123');
  await page.waitForLoadState('networkidle');
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

// JF-TC-2827
test('JF-TC-2827 - Invalid date range shows validation message', async () => {
  await page.locator('input[placeholder="سنة-شهر-يوم"]').first().fill('2026-06-18');
  await page.locator('input[placeholder="سنة-شهر-يوم"]').last().fill('2026-06-09');
  await page.waitForTimeout(1000);
  await expect(page.locator('text=يجب أن يكون تاريخ')).toBeVisible();
});

// JF-TC-2828
test('JF-TC-2828 - Status filter shows مفعل not نشط', async () => {
  await page.locator('text=كل الحالات').click();
  await page.waitForTimeout(500);
  await expect(page.locator('text=مفعل')).toBeVisible();
  await expect(page.locator('text=نشط')).not.toBeVisible();
});

// JF-TC-2831
test('JF-TC-2831 - No results message when filter matches nothing', async () => {
  await page.getByPlaceholder('ابحث برقم الترخيص').fill('ZZZZNOTEXIST999');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=لا توجد نتائج مطابقة لمعايير البحث')).toBeVisible();
});