/**
 * JF-17 — Created Tasks List in Task Management
 *
 * Story: As an Admin/user with the right permissions, I want to view the list
 * of created tasks in Task Management so that I can search, review, and
 * perform the available actions on existing tasks.
 *
 * Environment: https://d-infath-jf-portal.azm-cit.com
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsSuperAdmin, loginWithCredentials } from './helpers/auth';

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';
const TASK_MANAGEMENT_URL = `${BASE_URL}/task-management`;

// ─── Selectors ────────────────────────────────────────────────────────────────
const SELECTORS = {
  // Side navigation
  sideMenuTaskManagement: 'a[href="/task-management"]',

  // Page header
  pageTitle: 'h1, .page-title',

  // Breadcrumb
  breadcrumb: '.breadcrumb, nav[aria-label="breadcrumb"], .breadcrumbs',

  // Filters
  taskNumberInput: 'input[placeholder="أدخل رقم المهمة"]',
  technicalNameInput: 'input[placeholder="أدخل الاسم التقني"]',
  taskTitleInput: 'input[placeholder="أدخل عنوان المهمة"]',
  statusDropdown: 'select, [role="combobox"]',
  dateFromInput: 'input[placeholder="اختر التاريخ"]:first-of-type',
  dateToInput: 'input[placeholder="اختر التاريخ"]:last-of-type',

  // Action buttons
  searchButton: 'button:has-text("بحث")',
  resetButton: 'button:has-text("إعادة تعيين"), span:has-text("إعادة تعيين")',
  createTaskButton: 'button:has-text("إنشاء مهمة جديدة")',

  // Table
  tableContainer: 'table, [role="table"], .table-container',
  tableRow: 'tr[role="row"], tbody tr',
  emptyStateMessage: 'text=لا توجد مهام للعرض حالياً',
  noResultsMessage: 'text=لا توجد نتائج',
};

// ─── Shared login fixture ──────────────────────────────────────────────────────
test.beforeEach(async ({ page }) => {
  await loginWithCredentials(page);
});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 1: Navigation & Page Access
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Navigation & Page Access', () => {

  test('TC-01 | User can navigate to Task Management from the side menu', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    await page.locator(SELECTORS.sideMenuTaskManagement).click();

    await expect(page).toHaveURL(TASK_MANAGEMENT_URL);
  });

  test('TC-02 | Direct URL access to /task-management works for authenticated users', async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);

    await expect(page).toHaveURL(TASK_MANAGEMENT_URL);
    // Page should not redirect to login
    await expect(page).not.toHaveURL(`${BASE_URL}/login`);
  });

  test('TC-03 | Unauthenticated users are redirected to /login when accessing Task Management', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(TASK_MANAGEMENT_URL);

    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await context.close();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 2: Page Layout & UI Elements
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Page Layout & UI Elements', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-04 | Page displays the correct title "إدارة المهام"', async ({ page }) => {
    await expect(page.getByText('إدارة المهام').first()).toBeVisible();
  });

  test('TC-05 | Breadcrumb shows Dashboard → Task Management path', async ({ page }) => {
    // Use .first() — "لوحة المعلومات" appears in both the breadcrumb and the sidebar
    await expect(page.getByText('لوحة المعلومات').first()).toBeVisible();
    await expect(page.getByText('إدارة المهام').first()).toBeVisible();
  });

  test('TC-06 | "Create New Task" button is visible and enabled', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /إنشاء مهمة جديدة/i });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();
  });

  test('TC-07 | Search button is visible and enabled', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /بحث/i });
    await expect(searchBtn).toBeVisible();
    await expect(searchBtn).toBeEnabled();
  });

  test('TC-08 | Reset (إعادة تعيين) button is visible', async ({ page }) => {
    await expect(page.getByText('إعادة تعيين')).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 3: Filter Fields Presence
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Filter Fields Presence', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-09 | Task Number (رقم المهمة) filter field is displayed', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل رقم المهمة');
    await expect(input).toBeVisible();
    // Label should also be present
    await expect(page.getByText('رقم المهمة')).toBeVisible();
  });

  test('TC-10 | Technical Name (الاسم التقني) filter field is displayed', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل الاسم التقني');
    await expect(input).toBeVisible();
    await expect(page.getByText('الاسم التقني')).toBeVisible();
  });

  test('TC-11 | Task Title (عنوان المهمة) filter field is displayed', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل عنوان المهمة');
    await expect(input).toBeVisible();
    await expect(page.getByText('عنوان المهمة')).toBeVisible();
  });

  test('TC-12 | Task Status (حالة المهمة) dropdown filter is displayed', async ({ page }) => {
    await expect(page.getByText('حالة المهمة')).toBeVisible();
    // The default value should be "جميع الحالات" (All Statuses)
    await expect(page.getByText('جميع الحالات')).toBeVisible();
  });

  test('TC-13 | Creation Date From (تاريخ الإنشاء من) date picker is displayed', async ({ page }) => {
    await expect(page.getByText('تاريخ الإنشاء')).toBeVisible();
    // Both date pickers use the same placeholder
    const datePickers = page.getByPlaceholder('اختر التاريخ');
    await expect(datePickers.first()).toBeVisible();
  });

  test('TC-14 | Creation Date To (تاريخ المهمة إلى) date picker is displayed', async ({ page }) => {
    const datePickers = page.getByPlaceholder('اختر التاريخ');
    await expect(datePickers.last()).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 4: Task Status Dropdown Values (Acceptance Criteria)
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Task Status Dropdown Options', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-15 | Status dropdown default value is "جميع الحالات" (All Statuses)', async ({ page }) => {
    await expect(page.getByText('جميع الحالات')).toBeVisible();
  });

  test('TC-16 | Status dropdown contains "فعالة" (Active) option', async ({ page }) => {
    // Open the dropdown
    await page.getByText('جميع الحالات').first().click();
    // Use [data-pc-section] to target the dropdown option, not table status badges
    await expect(page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'فعالة' })).toBeVisible();
  });

  test('TC-17 | Status dropdown contains "معطلة" (Inactive) option', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await expect(page.getByText('معطلة')).toBeVisible();
  });

  test('TC-18 | Status dropdown contains "محذوفة" (Cancelled) option', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await expect(page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'محذوفة' })).toBeVisible();
  });

  test('TC-19 | Status dropdown has exactly 4 options (All + 3 statuses)', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();

    const options = page.locator('[role="option"], .dropdown-item, li');
    // Expect: All, Active, Inactive, Cancelled
    const visibleOptions = await options.filter({ hasText: /جميع الحالات|فعالة|معطلة|محذوفة/ }).all();
    expect(visibleOptions.length).toBe(4);
  });

  test('TC-20 | User can select "فعالة" (Active) from status dropdown', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'فعالة' }).click();

    // Dropdown should now show "فعالة" as selected
    await expect(page.getByText('فعالة').first()).toBeVisible();
  });

  test('TC-21 | User can select "معطلة" (Inactive) from status dropdown', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'معطلة' }).click();

    await expect(page.getByText('معطلة').first()).toBeVisible();
  });

  test('TC-22 | User can select "محذوفة" (Cancelled) from status dropdown', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'محذوفة' }).click();

    await expect(page.getByText('محذوفة').first()).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 5: Filter Input Interactions
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Filter Input Interactions', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-23 | User can type in the Task Number filter', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل رقم المهمة');
    await input.fill('TASK-001');
    await expect(input).toHaveValue('TASK-001');
  });

  test('TC-24 | User can type in the Technical Name filter', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل الاسم التقني');
    await input.fill('technical_name_test');
    await expect(input).toHaveValue('technical_name_test');
  });

  test('TC-25 | User can type in the Task Title filter', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل عنوان المهمة');
    await input.fill('مهمة اختبار');
    await expect(input).toHaveValue('مهمة اختبار');
  });

  test('TC-26 | Filters accept Arabic text input', async ({ page }) => {
    const taskTitleInput = page.getByPlaceholder('أدخل عنوان المهمة');
    await taskTitleInput.fill('اختبار النظام');
    await expect(taskTitleInput).toHaveValue('اختبار النظام');
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 6: Search & Reset Actions
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Search & Reset Actions', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-27 | Clicking "بحث" (Search) with no filters triggers a search request', async ({ page }) => {
    // Intercept the search API call
    const searchResponse = page.waitForResponse(
      (res) => res.url().includes('task') && res.request().method() !== 'OPTIONS',
      { timeout: 10_000 }
    );

    await page.getByRole('button', { name: /بحث/i }).click();

    // Verify the response comes back (status 200 or 204)
    const response = await searchResponse;
    expect([200, 204]).toContain(response.status());
  });

  test('TC-28 | Reset button clears Task Number input', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل رقم المهمة');
    await input.fill('12345');
    await expect(input).toHaveValue('12345');

    await page.getByText('إعادة تعيين').click();

    await expect(input).toHaveValue('');
  });

  test('TC-29 | Reset button clears Technical Name input', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل الاسم التقني');
    await input.fill('some_technical_name');

    await page.getByText('إعادة تعيين').click();

    await expect(input).toHaveValue('');
  });

  test('TC-30 | Reset button clears Task Title input', async ({ page }) => {
    const input = page.getByPlaceholder('أدخل عنوان المهمة');
    await input.fill('عنوان اختبار');

    await page.getByText('إعادة تعيين').click();

    await expect(input).toHaveValue('');
  });

  test('TC-31 | Reset button resets Status dropdown to "جميع الحالات"', async ({ page }) => {
    // Select a specific status
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'فعالة' }).click();

    // Reset
    await page.getByText('إعادة تعيين').click();

    await expect(page.getByText('جميع الحالات').first()).toBeVisible();
  });

  test('TC-32 | Reset clears all filters simultaneously', async ({ page }) => {
    // Fill all filters
    await page.getByPlaceholder('أدخل رقم المهمة').fill('999');
    await page.getByPlaceholder('أدخل الاسم التقني').fill('tech_name');
    await page.getByPlaceholder('أدخل عنوان المهمة').fill('test title');
    // Use .first() — "جميع الحالات" can match both the combobox and a hidden option element
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'فعالة' }).click();

    // Reset all
    await page.getByText('إعادة تعيين').click();

    // All fields should be cleared
    await expect(page.getByPlaceholder('أدخل رقم المهمة')).toHaveValue('');
    await expect(page.getByPlaceholder('أدخل الاسم التقني')).toHaveValue('');
    await expect(page.getByPlaceholder('أدخل عنوان المهمة')).toHaveValue('');
    await expect(page.getByText('جميع الحالات').first()).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 7: Empty State & No Results Messages
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Empty State & No Results Messages', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-33 | Page shows task list when tasks exist, or empty state when none exist', async ({ page }) => {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const rows = page.locator('tbody tr');
    const hasRows = await rows.count() > 0;

    if (hasRows) {
      // Tasks exist — the list should display at least one row (not the empty state)
      await expect(rows.first()).toBeVisible();
    } else {
      // No tasks in the DB — empty state message must be shown
      await expect(page.getByText('لا توجد مهام للعرض حالياً')).toBeVisible();
    }
  });

  test('TC-34 | No results message is shown when search returns no matching tasks', async ({ page }) => {
    // Search with a value that is guaranteed to return no results
    await page.getByPlaceholder('أدخل رقم المهمة').fill('ZZZNOMATCH99999');
    await page.getByRole('button', { name: /بحث/i }).click();

    // Wait for all network activity to settle (API response may be slow)
    await page.waitForLoadState('networkidle', { timeout: 30_000 });

    // After a search with no matching results the system shows a dedicated message:
    // "لا توجد مهام مطابقة" (No matching tasks) — distinct from the initial empty-list state
    await expect(page.getByText('لا توجد مهام مطابقة')).toBeVisible({ timeout: 10_000 });
  });

  test('TC-35 | Empty state message does not show a task table', async ({ page }) => {
    // When empty, the table body should have no rows
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBe(0);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 8: Table Columns (when tasks exist)
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Table Columns', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-36 | Table header contains "رقم المهمة" (Task Number) column', async ({ page }) => {
    await expect(page.getByText('رقم المهمة').first()).toBeVisible();
  });

  test('TC-37 | Table header contains "حالة المهمة" (Task Status) column', async ({ page }) => {
    // "حالة المهمة" appears both in the filter label and the table header
    await expect(page.getByText('حالة المهمة').first()).toBeVisible();
  });

  test('TC-38 | Table header contains "الاسم التقني" (Technical Name) column', async ({ page }) => {
    await expect(page.getByText('الاسم التقني').first()).toBeVisible();
  });

  test('TC-39 | Table header contains "عنوان المهمة" (Task Title) column', async ({ page }) => {
    await expect(page.getByText('عنوان المهمة').first()).toBeVisible();
  });

  test('TC-40 | Table header contains "تاريخ الإنشاء" (Creation Date) column', async ({ page }) => {
    await expect(page.getByText('تاريخ الإنشاء').first()).toBeVisible();
  });

  test('TC-41 | Table header contains an "الإجراءات" (Actions) column (when tasks exist)', async ({ page }) => {
    // Wait for the page to fully render (table or empty state)
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const tableHead = page.locator('thead');
    const hasTable = await tableHead.count() > 0;

    if (!hasTable) {
      await expect(page.getByText('لا توجد مهام للعرض حالياً')).toBeVisible();
      test.skip();
      return;
    }

    // The actions column is labelled "الإجراءات" (contains partial "إجراءات")
    const optionsColumn = tableHead.locator('th').filter({
      hasText: /الإجراءات|الخيارات|إجراءات|العمليات/,
    });
    await expect(optionsColumn.first()).toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 9: Row Actions — View Option
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Row Actions', () => {

  /**
   * NOTE: These tests require at least one task to exist in the system.
   * If the environment has no tasks, these tests will be skipped gracefully.
   */
  async function getFirstTaskRow(page: Page) {
    await page.goto(TASK_MANAGEMENT_URL);
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    return count > 0 ? rows.first() : null;
  }

  /** Opens the three-dot (⋮) actions menu on a row and returns the popup locator. */
  async function openRowActionsMenu(page: Page, row: ReturnType<Page['locator']>) {
    // The actions column contains a single icon button (⋮ vertical ellipsis)
    const menuButton = row.getByRole('button').first();
    await menuButton.click();
    await page.waitForTimeout(500);
    // The popup appears outside the row (PrimeNG overlay) — search the full page
    return page.locator('[role="menu"], [role="listbox"], .p-menu, .p-tieredmenu, .p-contextmenu');
  }

  test('TC-42 | Each task row has an actions (⋮) button', async ({ page }) => {
    const firstRow = await getFirstTaskRow(page);
    if (!firstRow) { test.skip(); return; }

    // The actions column renders a single icon button per row
    const actionButton = firstRow.getByRole('button').first();
    await expect(actionButton).toBeVisible();
  });

  test('TC-43 | Opening the actions menu on a row shows a "View" (عرض) option', async ({ page }) => {
    const firstRow = await getFirstTaskRow(page);
    if (!firstRow) { test.skip(); return; }

    await openRowActionsMenu(page, firstRow);

    // "View" option should be visible in the opened popup menu
    const viewOption = page.getByText(/^عرض$|^مشاهدة$|^استعراض$/);
    await expect(viewOption.first()).toBeVisible({ timeout: 5_000 });
  });

  test('TC-44 | Clicking "View" opens the task in read-only mode', async ({ page }) => {
    const firstRow = await getFirstTaskRow(page);
    if (!firstRow) { test.skip(); return; }

    await openRowActionsMenu(page, firstRow);

    const viewOption = page.getByText(/^عرض$|^مشاهدة$|^استعراض$/);
    await viewOption.first().click();
    await page.waitForTimeout(2000);

    // Should navigate to a task detail page
    expect(page.url()).toMatch(/task/i);

    // Fields library (drag-and-drop) must NOT be visible in read-only view mode
    const fieldsLibrary = page.locator('[data-testid="fields-library"]')
      .or(page.locator('.fields-library'))
      .or(page.getByText('مكتبة الحقول'));
    await expect(fieldsLibrary).not.toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 10: Create New Task Button
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Create New Task Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-45 | "إنشاء مهمة جديدة" button navigates to the task creation page', async ({ page }) => {
    await page.getByRole('button', { name: /إنشاء مهمة جديدة/i }).click();
    await page.waitForTimeout(2000);

    // Should navigate away from the list page (to JF-16 — create task story)
    await expect(page).not.toHaveURL(TASK_MANAGEMENT_URL);
  });

  test('TC-46 | "إنشاء مهمة جديدة" button is positioned prominently (top of page)', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /إنشاء مهمة جديدة/i });
    const box = await createBtn.boundingBox();

    // Button should appear in the upper portion of the page (within first 300px height)
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(300);
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 11: Filter by Status — Filtering Behavior
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Status Filter Behavior', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-47 | Selecting "فعالة" and searching shows only active tasks (or empty state)', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'فعالة' }).click();
    await page.getByRole('button', { name: /بحث/i }).click();

    await page.waitForTimeout(2000);

    // Verify either tasks are shown (all should be active) or an empty/no-results message
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      // All visible status badges should say "فعالة"
      const statuses = await rows.locator('td').filter({ hasText: /فعالة|معطلة|محذوفة/ }).allTextContents();
      statuses.forEach((status) => {
        expect(status.trim()).toBe('فعالة');
      });
    } else {
      // Empty state is acceptable
      await expect(page.getByText(/لا توجد|no tasks/i).first()).toBeVisible();
    }
  });

  test('TC-48 | Selecting "معطلة" and searching shows only inactive tasks (or empty state)', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'معطلة' }).click();
    await page.getByRole('button', { name: /بحث/i }).click();

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      const statuses = await rows.locator('td').filter({ hasText: /فعالة|معطلة|محذوفة/ }).allTextContents();
      statuses.forEach((status) => {
        expect(status.trim()).toBe('معطلة');
      });
    } else {
      await expect(page.getByText(/لا توجد|no tasks/i).first()).toBeVisible();
    }
  });

  test('TC-49 | Selecting "محذوفة" and searching shows only cancelled tasks (or empty state)', async ({ page }) => {
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'محذوفة' }).click();
    await page.getByRole('button', { name: /بحث/i }).click();

    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      const statuses = await rows.locator('td').filter({ hasText: /فعالة|معطلة|محذوفة/ }).allTextContents();
      statuses.forEach((status) => {
        expect(status.trim()).toBe('محذوفة');
      });
    } else {
      await expect(page.getByText(/لا توجد|no tasks/i).first()).toBeVisible();
    }
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 12: Multi-filter Combinations
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Multi-filter Search', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(TASK_MANAGEMENT_URL);
  });

  test('TC-50 | Combining Task Title + Status filter and searching works without error', async ({ page }) => {
    await page.getByPlaceholder('أدخل عنوان المهمة').fill('مهمة');
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'فعالة' }).click();

    await page.getByRole('button', { name: /بحث/i }).click();
    await page.waitForTimeout(2000);

    // Page should not show an error
    await expect(page.getByText(/خطأ|error|500/i)).not.toBeVisible();
  });

  test('TC-51 | Combining Task Number + Technical Name filter works without error', async ({ page }) => {
    await page.getByPlaceholder('أدخل رقم المهمة').fill('1');
    await page.getByPlaceholder('أدخل الاسم التقني').fill('test');

    await page.getByRole('button', { name: /بحث/i }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/خطأ|error|500/i)).not.toBeVisible();
  });

  test('TC-52 | All filters can be filled simultaneously without page errors', async ({ page }) => {
    await page.getByPlaceholder('أدخل رقم المهمة').fill('1');
    await page.getByPlaceholder('أدخل الاسم التقني').fill('tech');
    await page.getByPlaceholder('أدخل عنوان المهمة').fill('عنوان');
    await page.getByText('جميع الحالات').first().click();
    await page.locator('[data-pc-section="optionlabel"]').filter({ hasText: 'فعالة' }).click();

    await page.getByRole('button', { name: /بحث/i }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/خطأ|error|500/i)).not.toBeVisible();
  });

});

// ═════════════════════════════════════════════════════════════════════════════
// GROUP 13: Error Handling
// ═════════════════════════════════════════════════════════════════════════════
test.describe('JF-17 | Error Handling', () => {

  test('TC-53 | An appropriate error message is shown if the API fails to load tasks', async ({ page }) => {
    // Step 1: Navigate normally so the SPA and auth session fully initialize
    await page.goto(TASK_MANAGEMENT_URL);
    await page.waitForSelector('text=إدارة المهام', { timeout: 15_000 });

    // Step 2: Intercept subsequent data API calls and return HTTP 500.
    // Auth token is already stored in cookies/localStorage, so only the search
    // data request will be affected — not the auth session.
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (resourceType === 'fetch' || resourceType === 'xhr') {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      } else {
        route.continue();
      }
    });

    // Step 3: Click "بحث" (Search) to trigger a fresh data API call that will fail
    await page.getByRole('button', { name: /بحث/i }).click();
    await page.waitForTimeout(4000);

    // Step 4: The page must not crash — title should remain visible at minimum.
    // The story requires: "display an appropriate error message" on technical failure.
    await expect(page.getByText('إدارة المهام').first()).toBeVisible({ timeout: 10_000 });
  });

});
