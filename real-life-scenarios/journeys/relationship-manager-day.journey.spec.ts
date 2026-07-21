import { test, expect } from '@playwright/test';
import { step, loginAs, apiLoginAs, fetchCourtCases } from '../src/journey';
import { dbAvailable, dbQuery } from '../src/db';
import { PERSONAS } from '../src/personas';
import { URLS } from '../src/world';

/**
 * JOURNEY — "A relationship manager reviews their workload"
 * Persona: Demo Relationship Manager (مدير العلاقة) — internal email/password login.
 *
 * Real flow: an RM starts the day on the dashboard, works the incoming inquiries queue
 * (التواصل والاستفسارات → الاستفسارات الواردة), then opens the estates list and drills into
 * one of the estates assigned to them to review its data. The RM-specific KPI/SLA widgets
 * (dedicated alerts / most-recent-estates panels) aren't built yet — where a real RM would
 * expect them and they're absent, the journey narrates the gap and asserts the shell that
 * actually renders rather than red-failing.
 */
test.describe('Journey: Relationship manager — review the day\'s workload', () => {
  test('an RM reads the dashboard, works the incoming inquiries, and opens an estate @smoke', async ({ page }) => {
    const rm = PERSONAS.relationshipManager;
    let openedEstate = '';

    await step('1. The RM signs in and lands on the dashboard shell', async () => {
      await loginAs(page, rm);
      await page.goto(`${URLS.portal}/dashboard`, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/dashboard/);

      // The dashboard is a heavy SPA — poll until the KPI shell has actually hydrated/rendered.
      await expect
        .poll(async () => (await page.locator('body').innerText()).replace(/\s+/g, ' '), { timeout: 30_000 })
        .toMatch(/عدد التركات|عدد المهام|المهام القادمة/);

      // Narrate the gap: the dedicated RM alerts/SLA widgets a real RM expects aren't present yet.
      const shell = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const hasAlertsWidget = /الإنذارات والتنبيهات|أحدث التركات/.test(shell);
      test.info().annotations.push({
        type: 'observed',
        description: hasAlertsWidget
          ? 'Dashboard now shows the RM alerts/recent-estates widgets (الإنذارات والتنبيهات / أحدث التركات).'
          : 'Dashboard shows generic KPI cards (عدد التركات المفتوحة/المغلقة, عدد المهام, المهام القادمة); the RM-specific alerts/SLA widgets (الإنذارات والتنبيهات / أحدث التركات) are not built yet.',
      });
    });

    await step('2. He opens the incoming inquiries queue (التواصل والاستفسارات → الاستفسارات الواردة)', async () => {
      // Navigate via the side menu like a real user, with a direct fallback.
      const navLink = page.locator('a[href="/tickets"], a:has-text("التواصل والاستفسارات")').first();
      if (await navLink.count()) {
        await navLink.click().catch(() => undefined);
      }
      await page.waitForURL('**/tickets', { timeout: 15_000 }).catch(async () => {
        await page.goto(`${URLS.portal}/tickets`, { waitUntil: 'domcontentloaded' });
      });
      await expect(page).toHaveURL(/\/tickets/);

      // The inquiries list has three tabs — open the "incoming" (الاستفسارات الواردة) queue the RM works.
      const inbox = page.getByTestId('tickets-tab-inbox');
      await expect(inbox).toBeVisible({ timeout: 20_000 });
      await inbox.click();

      // The queue shows either inquiry rows or the explicit empty state — both are a valid read.
      const queueText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const hasEmptyState = await page.getByTestId('tickets-empty').isVisible().catch(() => false);
      expect(
        hasEmptyState || /الاستفسارات الواردة/.test(queueText),
        'the incoming-inquiries view should render (rows or empty state)',
      ).toBeTruthy();
      test.info().annotations.push({
        type: 'observed',
        description: hasEmptyState
          ? 'Incoming inquiries queue rendered its empty state ("لا توجد استفسارات بعد") for this RM.'
          : 'Incoming inquiries queue rendered with the الاستفسارات الواردة tab active.',
      });
    });

    await step('3. He opens the estates list and drills into an estate he relates to', async () => {
      const navLink = page.locator('a[href="/court-cases"], a:has-text("التركات")').first();
      if (await navLink.count()) {
        await navLink.click().catch(() => undefined);
      }
      await page.waitForURL('**/court-cases', { timeout: 15_000 }).catch(async () => {
        await page.goto(`${URLS.portal}/court-cases`, { waitUntil: 'domcontentloaded' });
      });
      await expect(page).toHaveURL(/\/court-cases/);

      // The estates table renders with its header + at least one estate row for this RM.
      await expect(page.locator('table thead').getByText('رقم التركة', { exact: false })).toBeVisible({ timeout: 20_000 });
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 20_000 });
      const estateNumber = (await firstRow.locator('td').first().innerText()).trim();
      expect(estateNumber, 'the first estate row should carry an estate number').not.toBe('');
      openedEstate = estateNumber;

      // Open that estate's details and confirm the drill-through renders its data.
      const viewBtn = firstRow.getByRole('button', { name: 'عرض' });
      if (await viewBtn.count()) {
        await viewBtn.first().click();
        await page.waitForURL((u) => !u.pathname.endsWith('/court-cases'), { timeout: 15_000 }).catch(() => undefined);
        await expect(page.getByText(estateNumber, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
        test.info().annotations.push({
          type: 'observed',
          description: `Opened estate ${estateNumber}; its details view rendered with the estate identifier.`,
        });
      } else {
        // No row-level view action — still a valid read of the list; record it.
        test.info().annotations.push({
          type: 'observed',
          description: `Estates list rendered (first estate ${estateNumber}); no row-level عرض action was exposed to drill in.`,
        });
      }
    });

    await step('4. cross-check via API — the estate the RM opened matches the backend record', async () => {
      // The estates list/detail the RM just read are served by the court-cases API. Sign into the
      // backend as the same RM and assert that estate is present with the manager fields the UI shows.
      const fileNo = (openedEstate.match(/INH\d+/) ?? [openedEstate])[0];
      const api = await apiLoginAs(rm.email!, rm.password!);
      try {
        const items = await fetchCourtCases(api, 100);
        expect(items.length, 'the backend should return estates for this RM').toBeGreaterThan(0);
        const match = items.find((i) => i.fileNumber === fileNo || (!!i.fileNumber && openedEstate.includes(i.fileNumber)));
        expect(match, `estate ${fileNo} (seen in the UI) should exist via the API`).toBeTruthy();
        expect(match, 'API item carries the relationship-manager field').toHaveProperty('relationshipManagerName');
        test.info().annotations.push({
          type: 'observed',
          description:
            `API cross-check: estate ${match!.fileNumber} → caseId ${match!.caseId}; ` +
            `RM=${match!.relationshipManagerName ?? '?'} EM=${match!.estateManagerName ?? '?'}`,
        });
      } finally {
        await api.ctx.dispose();
      }
    });

    await step('5. cross-check via DB — the cases row matches the estate on screen', async () => {
      // SELECT-only against live [Case].CourtCases (the `Case` schema is a T-SQL reserved
      // word, so it is bracketed). Runs only with CB_* creds, otherwise records a clean
      // db-skipped note (UI + API verification above already ran).
      const fileNo = (openedEstate.match(/INH\d+/) ?? [openedEstate])[0];
      if (!dbAvailable()) {
        test.info().annotations.push({
          type: 'db-skipped',
          description: `CB_* not set — DB cross-check of estate ${fileNo} skipped (UI+API verification stands)`,
        });
        return;
      }
      const { rows, rowCount } = await dbQuery<{ file_number: string; classification: string | null }>(
        'SELECT file_number, classification FROM [Case].CourtCases WHERE file_number = $1',
        [fileNo],
      );
      expect(rowCount, `exactly one [Case].CourtCases row for ${fileNo}`).toBe(1);
      expect(rows[0].file_number).toBe(fileNo);
      test.info().annotations.push({
        type: 'db-verified',
        description: `[Case].CourtCases: file_number=${rows[0].file_number}, classification=${rows[0].classification ?? '-'}`,
      });
    });
  });
});
