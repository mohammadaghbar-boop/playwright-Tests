import { test, expect, Browser, Page } from '@playwright/test';

let sharedPage: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  sharedPage = await context.newPage();

  // Login ONCE for all tests
  await sharedPage.goto('https://d-infath-jf-portal.azm-cit.com/nafath-login');
  await sharedPage.getByTestId('portal-card-service-providers').click();
  await sharedPage.getByRole('link', { name: 'Nafath' }).click();
  await sharedPage.getByRole('button', { name: 'Mock Users' }).click();
  await sharedPage.getByRole('button', { name: 'اختيار' }).first().click();
  await sharedPage.getByRole('button', { name: 'تسجيل الدخول' }).click();

  // Wait for Keycloak redirect
  await sharedPage.waitForURL('**/service-providers/**', { timeout: 60000 });
  await sharedPage.waitForLoadState('networkidle');

  // Select facility
  await sharedPage.getByRole('button', { name: 'الدخول على المنشأة' }).first().click();
  await sharedPage.waitForLoadState('networkidle');

  // Navigate to services list
  await sharedPage.getByRole('link', { name: 'الخدمات الخدمات' }).click();
  await sharedPage.waitForLoadState('networkidle');
});

test.beforeEach(async () => {
  // Just navigate back to services list before each test (no re-login)
  await sharedPage.goto('https://d-infath-jf-portal.azm-cit.com/service-providers/services');
  await sharedPage.waitForLoadState('networkidle');
});

// JF-TC-2820
test('JF-TC-2820 - Navigate to Services List from side menu', async () => {
  await expect(sharedPage.locator('text=قائمة الخدمات')).toBeVisible();
});

// JF-TC-2821
test('JF-TC-2821 - Services list displays correct columns', async () => {
  await expect(sharedPage.locator('text=نوع الخدمة').first()).toBeVisible();
  await expect(sharedPage.locator('text=النوع الفرعي').first()).toBeVisible();
  await expect(sharedPage.locator('text=التصنيف').first()).toBeVisible();
  await expect(sharedPage.locator('text=رقم الترخيص').first()).toBeVisible();
  await expect(sharedPage.locator('text=تاريخ آخر تحديث').first()).toBeVisible();
  await expect(sharedPage.locator('text=حالة الخدمة').first()).toBeVisible();
  await expect(sharedPage.locator('text=عرض التفاصيل').first()).toBeVisible();
});

// JF-TC-2825
test('JF-TC-2825 - License number partial search', async () => {
  await sharedPage.getByPlaceholder('ابحث برقم الترخيص').fill('123');
  await sharedPage.waitForLoadState('networkidle');
  const rows = sharedPage.locator('table tbody tr');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
});

// JF-TC-2827
test('JF-TC-2827 - Invalid date range shows validation message', async () => {
  await sharedPage.locator('input[placeholder="سنة-شهر-يوم"]').first().fill('2026-06-18');
  await sharedPage.locator('input[placeholder="سنة-شهر-يوم"]').last().fill('2026-06-09');
  await sharedPage.waitForTimeout(1000);
  await expect(sharedPage.locator('text=يجب أن يكون تاريخ')).toBeVisible();
});

// JF-TC-2828
test('JF-TC-2828 - Status filter shows مفعل not نشط', async () => {
  await sharedPage.locator('text=كل الحالات').click();
  await sharedPage.waitForTimeout(500);
  await expect(sharedPage.locator('text=مفعل')).toBeVisible();
  await expect(sharedPage.locator('text=نشط')).not.toBeVisible();
});

// JF-TC-2831
test('JF-TC-2831 - No results message when filter matches nothing', async () => {
  await sharedPage.getByPlaceholder('ابحث برقم الترخيص').fill('ZZZZNOTEXIST999');
  await sharedPage.waitForLoadState('networkidle');
  await expect(sharedPage.locator('text=لا توجد نتائج مطابقة لمعايير البحث')).toBeVisible();
});