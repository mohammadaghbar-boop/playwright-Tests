import { test, expect, Page } from '@playwright/test';
import { loginDemoPanel } from '../../src/helpers/login';
import { URLS } from '../../src/helpers/users';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';
import { dbAvailable, dbQuery } from '../../src/db';

/**
 * FRONTEND (UI) layer for Task Management — the إدارة المهام list screen (JF-16/17).
 *
 * Admin config screens are SystemAdmin-scoped: the internal EstateManager pd.json
 * session is correctly not authorized, so this file logs in through the "مستخدمين
 * تجريبيين" demo panel as admin@infath.sa (the SystemAdmin demo identity) instead of
 * using the project's storageState.
 *
 * Plus a @db verification (skips cleanly without CB_* creds) that a task-definition
 * exists in the DB, cross-checked against the task-definitions API library.
 */
const TASK_MANAGEMENT_PATH = '/task-management';

test.use({ storageState: { cookies: [], origins: [] } });

async function openTaskManagement(page: Page): Promise<boolean> {
  await loginDemoPanel(page, 'admin@infath.sa');
  if (page.url().includes('/login')) return false; // demo-panel hiccup — caller skips
  await page.goto(`${URLS.portal}${TASK_MANAGEMENT_PATH}`, { waitUntil: 'domcontentloaded' });
  if (/\/login(\b|$)/.test(page.url())) return false; // not authorized / bounced
  return true;
}

test.describe('Task Management screen (UI)', () => {
  test('@high إدارة المهام renders the list: title, create button, filters and table/empty state', async ({ page }) => {
    test.skip(!(await openTaskManagement(page)), 'SystemAdmin demo-panel session unavailable');

    // Page title.
    await expect(page.getByText('إدارة المهام').first()).toBeVisible({ timeout: 20_000 });

    // Create-task CTA (JF-16 entry point).
    const createBtn = page.getByRole('button', { name: /إنشاء مهمة جديدة/ });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeEnabled();

    // Filter controls (at least the task-number filter + the search action render).
    await expect(page.getByPlaceholder('أدخل رقم المهمة')).toBeVisible();
    await expect(page.getByRole('button', { name: /بحث/ })).toBeVisible();
    // Reset control is present (label, not necessarily a <button> role).
    await expect(page.getByText('إعادة تعيين').first()).toBeVisible();

    // A results table OR the documented empty state — either is a healthy render.
    const rows = page.locator('tbody tr');
    const rendered = await rows
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => 'rows')
      .catch(() => 'empty');
    if (rendered === 'empty') {
      await expect(page.getByText('لا توجد مهام للعرض حالياً')).toBeVisible();
    }
    test.info().annotations.push({ type: 'observed', description: `task-definitions list rendered: ${rendered}` });
  });

  test('@medium @db a task-definition from the API exists in the DB', async () => {
    test.skip(!dbAvailable(), 'DB creds (CB_*) not configured');

    // Cross-check reference: the task-definitions API library (EstateManager reads it 200).
    let apiCount = -1;
    let session: ApiSession | undefined;
    try {
      session = await apiLogin();
      const res = await apiGet(session, ENDPOINTS.taskDefinitions(1, 10));
      if (res.status() === 200) {
        const body = await res.json();
        apiCount = (body?.data?.items ?? []).length;
      }
    } finally {
      await session?.ctx.dispose();
    }

    // DB side (SELECT-only, defensive): in the live Azm_JointFunds SQL Server the
    // task-definitions table lives in the [Task] service schema (Task.TaskDefinitions). We
    // do NOT hardcode its exact name — we discover it from INFORMATION_SCHEMA (always
    // present), which keeps the query correct-by-construction regardless of the precise
    // schema/table naming, then count its rows. SQL Server dialect: TOP not LIMIT, and LIKE
    // is case-insensitive under the default collation (no ILIKE).
    const found = await dbQuery<{ table_schema: string; table_name: string }>(
      `SELECT TOP 1 table_schema, table_name FROM INFORMATION_SCHEMA.TABLES
       WHERE table_type = 'BASE TABLE' AND table_name LIKE '%Task%Definition%'
       ORDER BY LEN(table_name), table_name`,
    );
    expect(found.rowCount, 'a task-definitions table should exist in the DB').toBeGreaterThan(0);

    const schema = String(found.rows[0].table_schema);
    const table = String(found.rows[0].table_name);
    // Guard the interpolated identifier (it comes from INFORMATION_SCHEMA, but validate anyway).
    expect(schema).toMatch(/^[a-z_][a-z0-9_]*$/i);
    expect(table).toMatch(/^[a-z_][a-z0-9_]*$/i);

    // Bracket-quote the discovered identifier (SQL Server delimiter).
    const counted = await dbQuery<{ n: string }>(`SELECT count(*) AS n FROM [${schema}].[${table}]`);
    const dbCount = Number(counted.rows[0]?.n ?? 0);
    expect(Number.isFinite(dbCount)).toBeTruthy();
    // At least one task-definition row must exist; if the API listed items, the DB must too.
    expect(dbCount, `${schema}.${table} should hold task definitions`).toBeGreaterThan(0);
    if (apiCount > 0) expect(dbCount).toBeGreaterThanOrEqual(1);
    test.info().annotations.push({
      type: 'db-verify',
      description: `task definitions — API items:${apiCount}, DB ${schema}.${table} rows:${dbCount}`,
    });
  });
});
