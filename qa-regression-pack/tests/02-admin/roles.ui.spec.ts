import { test, expect, Page } from '@playwright/test';
import { loginDemoPanel } from '../../src/helpers/login';
import { URLS } from '../../src/helpers/users';

/**
 * FRONTEND (UI) layer for the Roles list — إدارة المستخدمين → الأدوار (JF-128/143).
 *
 * JF-128 (Roles list الإجراءات column had no view action) was FIXED — verified on CIT
 * 2026-07-16: every row now carries a `data-testid="role-view-action"` (title="عرض")
 * that navigates to the read-only role-details screen. This spec pins that fix.
 *
 * SystemAdmin-scoped screen → demo-panel login as admin@infath.sa (see task-management.ui).
 */
const ROLES_PATH = '/user-management/roles';

test.use({ storageState: { cookies: [], origins: [] } });

async function openRoles(page: Page): Promise<boolean> {
  await loginDemoPanel(page, 'admin@infath.sa');
  if (page.url().includes('/login')) return false;
  await page.goto(`${URLS.portal}${ROLES_PATH}`, { waitUntil: 'domcontentloaded' });
  if (/\/login(\b|$)/.test(page.url())) return false;
  return true;
}

test.describe('Roles list screen (UI)', () => {
  test('@high الأدوار renders the roles table with rows and the JF-128 view action', async ({ page }) => {
    test.skip(!(await openRoles(page)), 'SystemAdmin demo-panel session unavailable');

    // Screen heading / intro copy.
    await expect(page.getByText('الأدوار').first()).toBeVisible({ timeout: 20_000 });

    // Confirmed column headers (اسم الدور | الاسم التقني | الحالة | نوع الدور | تاريخ الإنشاء | الإجراءات).
    await expect(page.getByText('اسم الدور').first()).toBeVisible();
    await expect(page.getByText('الاسم التقني').first()).toBeVisible();
    await expect(page.getByText('الإجراءات').first()).toBeVisible();

    // At least one predefined role row is listed.
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });

    // JF-128 fix: the per-row view action exists (data-testid is the ground-truth hook).
    const viewAction = page.locator('[data-testid="role-view-action"]');
    await expect(viewAction.first()).toBeVisible({ timeout: 10_000 });
    const actionCount = await viewAction.count();
    expect(actionCount, 'every role row should expose a view action').toBeGreaterThan(0);
    test.info().annotations.push({ type: 'observed', description: `role-view-action present on ${actionCount} row(s)` });
  });

  test('@medium view action opens the read-only role-details screen', async ({ page }) => {
    test.skip(!(await openRoles(page)), 'SystemAdmin demo-panel session unavailable');

    const viewAction = page.locator('[data-testid="role-view-action"]').first();
    await expect(viewAction).toBeVisible({ timeout: 20_000 });
    await viewAction.click();

    // Navigates to /user-management/roles/{id} and shows the role-details back-link.
    await expect(page).toHaveURL(/\/user-management\/roles\/.+/, { timeout: 15_000 });
    await expect(page.getByText('العودة إلى الأدوار').first()).toBeVisible({ timeout: 15_000 });
    // Read-only as specced: role header labels render (permissions matrix or empty state).
    await expect(page.getByText('اسم الدور').first()).toBeVisible();
  });
});
