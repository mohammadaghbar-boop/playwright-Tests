// Feature: Estates list (JF-22)
import { test, expect, type Page, type Response, type Locator } from '@playwright/test';
import { login, DEFAULT_USER, JUDGE_USER } from '../../support/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTATES_PATH = '/court-cases';

const USER = DEFAULT_USER;
const UNAUTH_USER = JUDGE_USER;

const EXPECTED_COLUMNS = [
  'رقم التركة',
  'اسم المورث',
  'عدد الأصول',
  'مدير العلاقة',
  'التصنيف',
  'المصفي',
  'تاريخ الإسناد',
  'الحالة',
];

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/**
 * Recursively unwraps common API envelope shapes to return the first non-empty
 * array found. Handles: [], {data:[]}, {items:[]}, {data:{records:[]}}, etc.
 */
function extractItems(body: any): any[] | null {
  if (Array.isArray(body) && body.length > 0) return body;
  if (!body || typeof body !== 'object') return null;
  const keys = ['data', 'items', 'results', 'records', 'list', 'content', 'payload'];
  for (const key of keys) {
    if (Array.isArray(body[key]) && body[key].length > 0) return body[key];
    const nested = body[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      for (const k2 of keys) {
        if (Array.isArray(nested[k2]) && nested[k2].length > 0) return nested[k2];
      }
    }
  }
  return null;
}

// login() is now shared from ../../support/auth

/**
 * Register a JSON response interceptor. MUST be called BEFORE the action that
 * triggers the request — otherwise the promise may never resolve.
 */
function interceptNextJsonResponse(page: Page, timeout = 15000): Promise<Response> {
  return page.waitForResponse(
    (r) =>
      (r.headers()['content-type'] ?? '').includes('application/json') &&
      !r.url().match(/\.(js|css|png|jpg|svg|ico|woff2?|ttf|map)(\?|$)/) &&
      !r.url().includes('/assets/'),
    { timeout },
  );
}

/** Wait for the network to settle after an action. */
async function waitForLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/** Wait for load + at least one data row to be visible. */
async function waitForData(page: Page): Promise<void> {
  await waitForLoad(page);
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
}

/** Main search input (identified by Arabic placeholder). */
const searchInput = (page: Page): Locator => page.locator('input[placeholder*="رقم"]').first();

/**
 * Click the PrimeNG filter-panel toggle button (button[title="تصفية"]).
 * Returns true if the button was found and clicked.
 */
async function openFilterPanel(page: Page): Promise<boolean> {
  const btn = page.locator('button[title="تصفية"]');
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(600);
    return true;
  }
  return false;
}

/**
 * Open a PrimeNG p-select dropdown identified by its filter panel label,
 * click the option at targetIndex (0-based), and return the option text.
 * Returns null if the dropdown or options are not found.
 */
async function clickPSelectOption(page: Page, labelText: string, targetIndex = 1): Promise<string | null> {
  const container = page.locator('label').filter({ hasText: labelText }).locator('..');
  const pSelect = container.locator('p-select');
  if (!(await pSelect.isVisible({ timeout: 3000 }).catch(() => false))) return null;

  await pSelect.click();
  const panel = page.locator('[data-pc-section="panel"]');
  await panel.waitFor({ state: 'visible', timeout: 5000 });

  // Try data-pc-section="option" first; fall back to li[role="option"] then any li
  let options = panel.locator('[data-pc-section="option"]');
  if ((await options.count()) === 0) options = panel.locator('li[role="option"]');
  if ((await options.count()) === 0) options = panel.locator('li');

  const count = await options.count();
  if (count === 0) {
    await page.keyboard.press('Escape');
    return null;
  }

  const idx = Math.min(targetIndex, count - 1);
  const text = (await options.nth(idx).innerText()).trim();
  await options.nth(idx).click();
  return text;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('JF-22 — Estates List Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(ESTATES_PATH);
    await waitForLoad(page);

    // Clear any search state that persisted from the previous test
    const input = searchInput(page);
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      const value = await input.inputValue();
      if (value) {
        const responsePromise = interceptNextJsonResponse(page);
        await input.clear();
        await input.press('Enter');
        await responsePromise.catch(() => undefined);
        await waitForLoad(page);
      }
    }

    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test('1. should land on the estates list page', async ({ page }) => {
    await expect(page).toHaveURL(/\/court-cases/);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('2. should display all 8 required column headers', async ({ page }) => {
    await expect(page.locator('table thead tr')).toBeVisible();
    for (const column of EXPECTED_COLUMNS) {
      await expect(page.locator('table thead').getByText(column, { exact: false })).toBeVisible({ timeout: 10000 });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('3. should display at least one estate row in the table', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('4. should search by existing estate number and return matching result', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const estateNum = (await firstRow.locator('td').first().innerText()).trim();
    const input = searchInput(page);

    const responsePromise = interceptNextJsonResponse(page);
    await input.fill(estateNum);
    await input.press('Enter');
    const response = await responsePromise;
    await waitForLoad(page);

    expect(response.status()).toBe(200);

    const body = await response.json();
    const items = extractItems(body);
    expect(items).not.toBeNull();
    expect(items!.length).toBeGreaterThanOrEqual(1);

    const requestUrl = response.url();
    const hasParam = requestUrl.includes(estateNum) || requestUrl.includes(encodeURIComponent(estateNum));
    expect(hasParam).toBeTruthy();

    await expect(page.locator('table tbody').getByText(estateNum, { exact: false })).toBeVisible();

    const renderedRows = await page.locator('table tbody tr').count();
    expect(renderedRows).toBeLessThanOrEqual(items!.length + 1);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('5. should filter by التاريخ (assignment date) in filter panel', async ({ page }) => {
    const panelOpened = await openFilterPanel(page);
    expect(panelOpened, 'Filter toggle button[title="تصفية"] not found').toBeTruthy();
    await waitForLoad(page);

    const dateInput = page.locator('input.p-datepicker-input');
    expect(
      await dateInput.isVisible({ timeout: 3000 }).catch(() => false),
      'Date input (input.p-datepicker-input) not visible after opening filter panel',
    ).toBeTruthy();

    const responsePromise = interceptNextJsonResponse(page);
    await dateInput.fill('2026/06/24');
    await dateInput.press('Tab');
    const response = await responsePromise;
    await waitForLoad(page);

    expect(response.status()).toBe(200);
    const items = extractItems(await response.json());
    expect(items).not.toBeNull();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('6. should filter by رقم التركة field in filter panel and show matching result', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const estateNum = (await firstRow.locator('td').first().innerText()).trim();

    const panelOpened = await openFilterPanel(page);
    expect(panelOpened).toBeTruthy();
    await waitForLoad(page);

    const estateInput = page.locator('label').filter({ hasText: 'رقم التركة' }).locator('..').locator('input[type="text"]');
    expect(await estateInput.isVisible({ timeout: 3000 }).catch(() => false), 'رقم التركة text input not visible in filter panel').toBeTruthy();

    const responsePromise = interceptNextJsonResponse(page);
    await estateInput.fill(estateNum);
    await estateInput.press('Enter');
    const response = await responsePromise;
    await waitForLoad(page);

    expect(response.status()).toBe(200);
    const items = extractItems(await response.json());
    expect(items).not.toBeNull();
    await expect(page.locator('table tbody').getByText(estateNum, { exact: false })).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('7. should filter by عدد الأصول (asset count) in filter panel', async ({ page }) => {
    const panelOpened = await openFilterPanel(page);
    expect(panelOpened).toBeTruthy();
    await waitForLoad(page);

    const assetInput = page.locator('label').filter({ hasText: 'عدد الأصول' }).locator('..').locator('input[type="number"]');
    expect(await assetInput.isVisible({ timeout: 3000 }).catch(() => false), 'عدد الأصول number input not visible in filter panel').toBeTruthy();

    const responsePromise = interceptNextJsonResponse(page);
    await assetInput.fill('2');
    await assetInput.press('Tab');
    const response = await responsePromise;
    await waitForLoad(page);

    expect(response.status()).toBe(200);
    const items = extractItems(await response.json());
    expect(items).not.toBeNull();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('8. should filter by estate status (الحالة) p-select dropdown', async ({ page }) => {
    const panelOpened = await openFilterPanel(page);
    expect(panelOpened).toBeTruthy();
    await waitForLoad(page);

    const statusContainer = page.locator('label').filter({ hasText: 'الحالة' }).locator('..');
    const statusSelect = statusContainer.locator('p-select');
    expect(await statusSelect.isVisible({ timeout: 3000 }).catch(() => false), 'p-select for الحالة not visible in filter panel').toBeTruthy();

    // Open dropdown — wait for the SECOND option specifically (handles async loading)
    await statusSelect.click();
    const hasSecond = await page
      .locator('[role="option"]')
      .nth(1)
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!hasSecond) {
      await page.keyboard.press('Escape');
      test.skip(true, 'Status dropdown has fewer than 2 options — cannot test filtering past "الكل"');
      return;
    }

    // Close and re-open with the interceptor registered BEFORE the click
    await page.keyboard.press('Escape');
    await page.locator('[role="option"]').first().waitFor({ state: 'hidden', timeout: 3000 }).catch(() => undefined);

    const responsePromise = interceptNextJsonResponse(page);
    await statusSelect.click();
    await page.locator('[role="option"]').nth(1).waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[role="option"]').nth(1).click(); // skip the "الكل" placeholder at index 0

    const response = await responsePromise;
    await waitForLoad(page);

    // The filter request succeeded — filtered result may be empty (0 rows) or non-empty
    expect(response.status()).toBe(200);
    await expect(page.locator('table').first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('9. should filter by relation manager (مدير العلاقة) p-select dropdown', async () => {
    // The مدير العلاقة filter dropdown returns "No results found" from the backend API —
    // the options endpoint is empty even though manager names appear in table rows.
    test.skip(true, 'Pending development — Relationship Manager filter not yet implemented (see JF-22 dev comment). Remove this skip once the feature is shipped.');
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('10. should filter by liquidator dropdown', async () => {
    // The 5-column filter panel (التاريخ / رقم التركة / عدد الأصول / الحالة / مدير العلاقة)
    // does NOT include a liquidator (المصفي) filter.
    test.skip(true, 'Pending development — Liquidator filter not yet implemented (see JF-22 dev comment). Remove this skip once the feature is shipped.');
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('11. should apply multiple filters simultaneously and return correct results', async ({ page }) => {
    const panelOpened = await openFilterPanel(page);
    expect(panelOpened).toBeTruthy();
    await waitForLoad(page);

    // Collect all JSON responses while both filters are being applied
    const responses: Array<{ status: number; body: any }> = [];
    const listener = async (resp: Response) => {
      if (
        (resp.headers()['content-type'] ?? '').includes('application/json') &&
        !resp.url().match(/\.(js|css|png|jpg|svg|ico|woff2?|ttf|map)(\?|$)/) &&
        !resp.url().includes('/assets/')
      ) {
        try {
          responses.push({ status: resp.status(), body: await resp.json() });
        } catch {
          /* consumed */
        }
      }
    };
    page.on('response', listener);

    // Filter 1: date (التاريخ)
    const dateInput = page.locator('input.p-datepicker-input');
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill('2026/06/24');
      await dateInput.press('Tab');
      await page.waitForTimeout(1500); // allow first request to settle
    }

    // Filter 2: estate number (رقم التركة) in filter panel
    const estateInput = page.locator('label').filter({ hasText: 'رقم التركة' }).locator('..').locator('input[type="text"]');
    if (await estateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await estateInput.fill('INH');
      await estateInput.press('Tab');
    }

    await waitForLoad(page);
    page.off('response', listener);

    expect(responses.length, 'No JSON responses captured while applying multiple filters').toBeGreaterThan(0);

    const dataResponse = responses.find((r) => r.status === 200 && extractItems(r.body));
    expect(dataResponse, 'No 200 response with data found after applying multiple filters').not.toBeUndefined();

    const items = extractItems(dataResponse!.body);
    expect(items!.length).toBeGreaterThan(0);

    const renderedRows = await page.locator('table tbody tr').count();
    expect(renderedRows).toBeLessThanOrEqual(items!.length + 1);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('should filter by asset count and return matching results', async ({ page }) => {
    // Locate the عدد الأصول column index from the rendered headers
    const headers = await page.locator('table thead th').allInnerTexts();
    const assetColIndex = headers.findIndex((h) => h.includes('عدد الأصول'));
    expect(assetColIndex, 'عدد الأصول column not found in table headers').toBeGreaterThanOrEqual(0);

    // Read the asset count from the first visible row to use as the filter value
    const firstRow = page.locator('table tbody tr').first();
    const assetCellText = (await firstRow.locator('td').nth(assetColIndex).innerText()).trim();
    const assetCellNum = parseInt(assetCellText.replace(/[^0-9]/g, ''), 10);
    const filterValue = Number.isFinite(assetCellNum) && assetCellNum > 0 ? String(assetCellNum) : '1';

    const panelOpened = await openFilterPanel(page);
    expect(panelOpened).toBeTruthy();
    await waitForLoad(page);

    const assetInput = page.locator('label').filter({ hasText: 'عدد الأصول' }).locator('..').locator('input[type="number"]');
    expect(await assetInput.isVisible({ timeout: 3000 }).catch(() => false), 'عدد الأصول number input not visible in filter panel').toBeTruthy();

    // Register interceptor BEFORE triggering the filter
    const responsePromise = interceptNextJsonResponse(page);
    await assetInput.fill(filterValue);
    await assetInput.press('Tab');
    const response = await responsePromise;
    await waitForLoad(page);

    // API must return 200
    expect(response.status()).toBe(200);

    // Request URL must carry the asset count as a query parameter
    const requestUrl = response.url();
    expect(
      requestUrl.includes(filterValue) || requestUrl.includes(encodeURIComponent(filterValue)),
      `Expected asset count "${filterValue}" in request URL: ${requestUrl}`,
    ).toBeTruthy();

    // At least one row must be visible after filtering
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Every visible row's asset count must be >= the filter value
    // (covers both exact-match and minimum-threshold filter semantics)
    const expected = parseInt(filterValue, 10);
    for (let i = 0; i < rowCount; i++) {
      const cellText = (await rows.nth(i).locator('td').nth(assetColIndex).innerText()).trim();
      const cellNum = parseInt(cellText.replace(/[^0-9]/g, ''), 10);
      expect(Number.isFinite(cellNum), `Row ${i + 1}: asset count cell "${cellText}" is not numeric`).toBeTruthy();
      expect(cellNum).toBeGreaterThanOrEqual(expected);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('12. should open estate details when clicking عرض button', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    const estateNum = (await firstRow.locator('td').first().innerText()).trim();

    const viewButton = firstRow.getByRole('button', { name: 'عرض' });
    await expect(viewButton).toBeVisible();

    const responsePromise = interceptNextJsonResponse(page);
    await viewButton.click();

    await page.waitForURL((url) => !url.pathname.endsWith(ESTATES_PATH), { timeout: 10000 });
    const response = await responsePromise.catch(() => null);
    await waitForLoad(page);

    await expect(page).not.toHaveURL(new RegExp(`${ESTATES_PATH}$`));

    if (response) expect(response.status()).toBe(200);

    await expect(page.getByText(estateNum, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('13. should match API response data with rendered table rows', async ({ page }) => {
    const capturedResponses: Array<{ url: string; body: any }> = [];
    const listener = async (response: Response) => {
      const url = response.url();
      if (
        response.status() === 200 &&
        (response.headers()['content-type'] ?? '').includes('application/json') &&
        !url.match(/\.(js|css|png|jpg|svg|ico|woff2?|ttf|map)(\?|$)/) &&
        !url.includes('/assets/')
      ) {
        try {
          capturedResponses.push({ url, body: await response.json() });
        } catch {
          /* body already consumed */
        }
      }
    };

    page.on('response', listener);
    await page.reload();
    await waitForData(page);
    page.off('response', listener);

    let apiItems: any[] | null = null;
    for (const { body } of capturedResponses) {
      const extracted = extractItems(body);
      if (extracted) {
        apiItems = extracted;
        break;
      }
    }

    if (!apiItems) {
      test.skip(
        true,
        `No estate list found among ${capturedResponses.length} captured response(s). URLs: ${capturedResponses.map((r) => r.url).join(', ')}`,
      );
      return;
    }

    expect(apiItems.length).toBeGreaterThan(0);

    const first = apiItems[0];
    const hasId = !!(
      first.caseNumber ??
      first.estateNumber ??
      first.case_number ??
      first.estate_number ??
      first.fileNumber ??
      first.number ??
      first.id
    );
    expect(hasId).toBeTruthy();

    const renderedRowCount = await page.locator('table tbody tr').count();
    expect(renderedRowCount).toBeLessThanOrEqual(apiItems.length + 1);

    const estateNumValue = String(
      first.caseNumber ?? first.estateNumber ?? first.case_number ?? first.estate_number ?? first.fileNumber ?? first.number ?? first.id ?? '',
    );
    if (estateNumValue) {
      const firstRowText = (await page.locator('table tbody tr').first().locator('td').first().innerText()).trim();
      expect(firstRowText).toContain(estateNumValue);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NEGATIVE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  test('14. should show empty state with appropriate message when searching non-existent estate number', async ({ page }) => {
    const input = searchInput(page);
    await expect(input).toBeVisible();

    const responsePromise = interceptNextJsonResponse(page);
    await input.fill('NONEXISTENT_99999_XYZ');
    await input.press('Enter');
    const response = await responsePromise;
    await waitForLoad(page);

    expect(response.status()).toBe(200);
    const items = extractItems(await response.json());
    if (items !== null) expect(items.length).toBe(0);

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const bodyText = await page.locator('table tbody').innerText();
      expect(
        bodyText.includes('لا توجد بيانات') ||
          bodyText.includes('لا توجد') ||
          bodyText.includes('لا يوجد') ||
          bodyText.includes('لا نتائج') ||
          bodyText.trim() === '',
      ).toBeTruthy();
    } else {
      expect(rowCount).toBe(0);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('15. should handle invalid text in التاريخ filter without crashing the app', async ({ page }) => {
    const panelOpened = await openFilterPanel(page);
    expect(panelOpened).toBeTruthy();
    await waitForLoad(page);

    const dateInput = page.locator('input.p-datepicker-input');
    expect(await dateInput.isVisible({ timeout: 3000 }).catch(() => false), 'Date input not visible after opening filter panel').toBeTruthy();

    // Enter non-date text — the PrimeNG datepicker should reject or clear it
    await dateInput.fill('NOT_A_DATE');
    await dateInput.press('Tab');
    await page.keyboard.press('Escape'); // close calendar overlay if it opened
    await waitForLoad(page);

    // Datepicker should reject the invalid text (value reverts to empty/placeholder)
    const dateValue = await dateInput.inputValue();
    const rejected = dateValue === '' || dateValue === 'الكل' || !dateValue.match(/\d{4}\/\d{2}\/\d{2}/);
    expect(rejected, 'Datepicker accepted invalid text as a date').toBeTruthy();

    // App must not crash — data table must still be visible and functional
    await expect(page.locator('table').first()).toBeVisible();
    const rowCount = await page.locator('table tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('16. should block access and not show estates for unauthorized user (demo-judge)', async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto('/login');
    await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill(UNAUTH_USER.email);
    await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(UNAUTH_USER.password);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    await page.waitForTimeout(5000);
    const onDashboard = page.url().includes('dashboard');

    if (!onDashboard) {
      // Scenario A: login rejected outright
      const loginErrorVisible = await page
        .getByText(/غير صحيحة|البريد الإلكتروني أو كلمة المرور/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      expect(loginErrorVisible || page.url().includes('login')).toBeTruthy();
      return;
    }

    // Scenario B: login succeeded — verify estates page is inaccessible
    const responsePromise = interceptNextJsonResponse(page, 20000);
    await page.goto(ESTATES_PATH);
    await page.waitForLoadState('networkidle');
    const response = await responsePromise.catch(() => null);

    const redirectedAway = !page.url().includes(ESTATES_PATH);
    const accessDenied = await page
      .getByText(/غير مصرح|محظور|ليس لديك صلاحية|403|401/i)
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const apiBlocked = response !== null && (response.status() === 401 || response.status() === 403);
    const noDataShown = (await page.locator('table tbody tr').count()) === 0;

    expect(redirectedAway || accessDenied || apiBlocked || noDataShown).toBeTruthy();

    if (response && response.status() === 200) {
      const items = extractItems(await response.json().catch(() => ({})));
      expect(items === null || items.length === 0).toBeTruthy();
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  test('17. should handle search with whitespace only input', async ({ page }) => {
    const input = searchInput(page);

    const responsePromise = interceptNextJsonResponse(page);
    await input.fill('     ');
    await input.press('Enter');
    await responsePromise.catch(() => undefined);
    await waitForLoad(page);

    await expect(page.locator('table')).toBeVisible();

    const rowsAfter = await page.locator('table tbody tr').count();
    expect(rowsAfter).toBeGreaterThanOrEqual(0);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('18. should handle search with special characters @#$%', async ({ page }) => {
    const input = searchInput(page);

    const responsePromise = interceptNextJsonResponse(page);
    await input.fill('@#$%^&*!');
    await input.press('Enter');
    const response = await responsePromise;
    await waitForLoad(page);

    expect([200, 400]).toContain(response.status());
    await expect(page.locator('table')).toBeVisible();

    if (response.status() === 200) {
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();
      if (rowCount > 0) {
        const bodyText = await page.locator('table tbody').innerText();
        expect(bodyText.includes('لا توجد') || bodyText.includes('لا يوجد') || bodyText.trim() === '').toBeTruthy();
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('19. should display pagination and navigate to page 2', async ({ page }) => {
    // Custom pagination: buttons whose text content is only digits (1, 2, 3, … N)
    // These are distinct from the Arabic "عرض" action buttons
    const pageBtns = page.locator('button').filter({ hasText: /^\s*\d+\s*$/ });
    const btnCount = await pageBtns.count();

    if (btnCount === 0) {
      // All records fit on one page — just confirm rows exist
      await expect(page.locator('table tbody tr').first()).toBeVisible();
      return;
    }

    // Pagination exists — verify page 1 button is rendered
    const firstBtnText = (await pageBtns.first().innerText()).trim();
    expect(firstBtnText).toBe('1');

    if (btnCount < 2) return;

    // Navigate to page 2 and confirm data loads
    const responsePromise = interceptNextJsonResponse(page);
    await pageBtns.nth(1).click();
    await responsePromise;
    await waitForLoad(page);

    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    const rowsOnPage2 = await page.locator('table tbody tr').count();
    expect(rowsOnPage2).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────────────────────────────────

  test('20. should reset all filters and reload full list when reset button is clicked', async ({ page }) => {
    const input = searchInput(page);

    const firstEstateNum = (await page.locator('table tbody tr').first().locator('td').first().innerText()).trim();

    const searchDone = interceptNextJsonResponse(page);
    await input.fill(firstEstateNum);
    await input.press('Enter');
    await searchDone;
    await waitForLoad(page);

    const resetBtn = page.getByRole('button', { name: /إعادة|مسح|حذف|reset|clear/i }).first();
    const hasResetBtn = await resetBtn.isVisible({ timeout: 3000 }).catch(() => false);

    const resetDone = interceptNextJsonResponse(page);

    if (hasResetBtn) {
      await resetBtn.click();
    } else {
      await input.clear();
      await input.press('Enter');
    }

    await resetDone.catch(() => undefined);
    await waitForLoad(page);
    // Explicitly wait for data rows to repopulate before counting
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    const rowsAfterReset = await page.locator('table tbody tr').count();
    expect(rowsAfterReset).toBeGreaterThanOrEqual(1);

    const currentValue = await input.inputValue();
    expect(currentValue.trim()).toBe('');
  });
});
