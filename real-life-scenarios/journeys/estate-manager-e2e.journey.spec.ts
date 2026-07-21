import { test, expect, Page } from '@playwright/test';
import { step, loginAs, apiLoginAs, apiGet, fetchCourtCases } from '../src/journey';
import { dbAvailable, dbQuery } from '../src/db';
import { PERSONAS } from '../src/personas';
import { URLS, FIXTURES } from '../src/world';

/**
 * JOURNEY — "An estate manager works a new estate file"
 * Persona: Demo Estate Manager (internal email/password login).
 *
 * Real flow: the estate manager signs in, opens التركات (the estates list), picks a
 * seeded estate file, and reviews it end-to-end the way they would when a new file
 * lands — بيانات التركة, الورثة, الأصول, سجل التركة, the external inquiries, the
 * assigned managers + التصنيف, and finally the financial totals (القيمة التقديرية),
 * which currently read "-" (JF-1058 / JF-1100) — narrated as the true experience.
 *
 * Read-only: opens and reads; never confirms/rejects/mutates estate state.
 */

// Newest-seeded first (INH00016 is the round-3 assigned golden estate); each is a real seeded file.
const ESTATE_CANDIDATES = [FIXTURES.assignedEstate, 'INH00009', 'INH00007', 'INH00005'];

const DETAIL_TABS = ['بيانات التركة', 'بيانات الورثة', 'الأصول', 'سجل التركة'] as const;

/** Navigate an internal page — click the sidebar link, fall back to the route. */
async function openInternalPage(page: Page, linkName: string, routeFallback: string): Promise<void> {
  const link = page.getByRole('link', { name: linkName, exact: false }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click().catch(() => undefined);
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  } else {
    await page.goto(routeFallback, { waitUntil: 'domcontentloaded' });
  }
}

/** True once an estate detail page is on screen (بيانات التركة exists only on the detail). */
async function estateDetailOpen(page: Page): Promise<boolean> {
  return page
    .getByText('بيانات التركة', { exact: false })
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
}

/**
 * Open the first reachable seeded estate from the list, like a user: search for the file
 * number in the list search box, apply بحث, then click that row's عرض (view) action and
 * confirm the detail tabs render. Returns the opened file number.
 */
async function openEstate(page: Page, candidates: string[]): Promise<string> {
  for (const file of candidates) {
    await openInternalPage(page, 'التركات', '/court-cases');

    const box = page.getByPlaceholder('رقم الملف أو اسم المورث...');
    await box.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
    await box.fill(file).catch(() => undefined);
    await page.getByRole('button', { name: 'بحث', exact: true }).first().click().catch(() => undefined);

    // Wait for the filtered row to actually render (search is async).
    const row = page.getByRole('row', { name: new RegExp(file) }).first();
    try {
      await row.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      continue; // this file is not visible to this manager — try the next candidate
    }

    const viewBtn = row.getByRole('button', { name: 'عرض' });
    if (await viewBtn.count()) {
      await viewBtn.click().catch(() => undefined);
    } else {
      await row.click().catch(() => undefined);
    }
    if (await estateDetailOpen(page)) return file;
  }
  throw new Error(`could not open any seeded estate from: ${candidates.join(', ')}`);
}

test.describe('Journey: Estate Manager — works a new estate file', () => {
  test('an estate manager opens a seeded estate and reviews the whole file @smoke', async ({ page }) => {
    const em = PERSONAS.estateManager;
    let openedFile = '';

    await step('1. The estate manager signs in and reaches the workspace', async () => {
      await loginAs(page, em);
      expect(page.url()).toContain(URLS.portal.replace(/^https?:\/\//, ''));
      expect(page.url()).not.toContain('/login');
    });

    await step('2. Opens التركات — the estates list, incl. the seeded INH000xx files', async () => {
      await openInternalPage(page, 'التركات', '/court-cases');
      // The list carries the JF-464 classification + JF-415 liquidator columns.
      await expect(page.getByRole('columnheader', { name: 'التصنيف' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'المصفي' })).toBeVisible();
      // At least one seeded estate file is listed.
      await expect(page.getByRole('main').getByText(/INH\d{5}/).first()).toBeVisible();
    });

    await step('3. Opens an estate and reviews its tabs', async () => {
      openedFile = await openEstate(page, ESTATE_CANDIDATES);
      const main = page.getByRole('main');
      test.info().annotations.push({ type: 'observed', description: `opened estate ${openedFile}` });
      for (const tab of DETAIL_TABS) {
        await expect(main.getByText(tab, { exact: false }).first(), `tab "${tab}" should be present`).toBeVisible();
      }
      // Walk into the events log (سجل التركة) — the immutable per-estate history.
      await main.getByText('سجل التركة', { exact: false }).first().click().catch(() => undefined);
      const body = (await main.innerText()).replace(/\s+/g, ' ');
      test.info().annotations.push({
        type: 'observed',
        description: /انشاء التركة|إنشاء التركة|تعيين مدير|الحدث|سجل التركة/.test(body)
          ? 'events log (سجل التركة) renders its history'
          : 'events log tab opened',
      });
    });

    await step('4. Reviews the external inquiries (SAMA/CMA/REGA/deed/Marjea) as shown', async () => {
      const main = page.getByRole('main');
      // Inquiry status surfaces around the assets / estate-data area; read what the UI shows.
      await main.getByText('الأصول', { exact: false }).first().click().catch(() => undefined);
      const body = (await main.innerText()).replace(/\s+/g, ' ');
      const signals = [
        'بانتظار رد', // awaiting async callback (SAMA)
        'مكتمل',
        'مصرف', 'ساما', 'SAMA',
        'هيئة السوق', 'CMA',
        'العقاري', 'REGA',
        'صك', 'مرجع', 'Marjea',
        'استعلام',
      ].filter((s) => body.includes(s));
      test.info().annotations.push({
        type: 'observed',
        description: signals.length
          ? `external-inquiry indicators visible: ${signals.join(', ')}`
          : 'no external-inquiry status text surfaced on the assets view (inquiries observed via API in the cycle; UI surface is thin)',
      });
      // The estate file is still open — the review continues.
      await expect(main.getByText('بيانات التركة', { exact: false }).first()).toBeVisible();
    });

    await step('5. Checks assigned managers (مدير التركة / مدير العلاقة) and التصنيف', async () => {
      const main = page.getByRole('main');
      await main.getByText('بيانات التركة', { exact: false }).first().click().catch(() => undefined);
      const body = (await main.innerText()).replace(/\s+/g, ' ');
      // Auto-assigned managers (JF-155/JF-156) are stamped on every estate.
      expect(body, 'estate should show its manager labels').toMatch(/مدير التركة|مدير العلاقات|مدير العلاقة/);
      const hasEM = /Demo Estate Manager|مدير التركة/.test(body);
      const hasRM = /Demo Relationship Manager|مدير العلاقات|مدير العلاقة/.test(body);
      const classMatch = body.match(/التصنيف\s*[:：]?\s*([A-D]|-)/);
      test.info().annotations.push({
        type: 'observed',
        description: `managers → estate:${hasEM ? 'set' : '?'} relationship:${hasRM ? 'set' : '?'}; ` +
          `classification → ${classMatch ? classMatch[1] : 'not shown on detail (list column التصنيف)'}`,
      });
    });

    await step('6. Reads the financial totals / القيمة التقديرية (may be "-" per JF-1058/JF-1100)', async () => {
      const main = page.getByRole('main');
      const body = (await main.innerText()).replace(/\s+/g, ' ');
      const totalMatch = body.match(/القيمة التقديرية للتركة\s*([^\s].{0,20}?)(?:خطاب|بيانات|$)/);
      const shown = totalMatch ? totalMatch[1].trim() : '(label not located on this view)';
      const isDash = shown === '-' || /^[-—]$/.test(shown) || /^[-—]\b/.test(shown);
      test.info().annotations.push({
        type: isDash ? 'blocked-by' : 'observed',
        description: isDash
          ? `JF-1058/JF-1100: القيمة التقديرية للتركة still reads "-" — no estate valuation reaches the totals, so the manager sees no financial figure (the real current experience)`
          : `القيمة التقديرية للتركة shows: ${shown}`,
      });
      // Confirm the manager reached and read the estate's financial section (label present),
      // regardless of whether a number or "-" is shown.
      await expect(main.getByText('القيمة التقديرية', { exact: false }).first()).toBeVisible();
    });

    await step('7. cross-check via API — the estate on screen matches the backend record', async () => {
      // The estates list + detail the manager just read are served by the court-cases API.
      // Sign into the backend as the same EstateManager and assert the estate the UI opened
      // is present with the same file number + auto-assigned managers (JF-155/156 columns).
      const api = await apiLoginAs(em.email!, em.password!);
      try {
        const items = await fetchCourtCases(api, 100);
        expect(items.length, 'the backend should return the seeded estates').toBeGreaterThan(0);

        const match = items.find((i) => i.fileNumber === openedFile);
        expect(match, `estate ${openedFile} (seen in the UI) should exist via the API`).toBeTruthy();
        expect(match!.fileNumber).toBe(openedFile);
        // The manager columns the detail page showed are the same the API returns.
        expect(match, 'API item carries the estate-manager field').toHaveProperty('estateManagerName');
        expect(match, 'API item carries the relationship-manager field').toHaveProperty('relationshipManagerName');

        // The detail GET resolves for the same case id (the tabs the manager walked).
        const detailRes = await apiGet(api, `/cases/api/v1/court-cases/${match!.caseId}`);
        expect(detailRes.status(), 'estate detail GET should respond 200').toBe(200);
        expect((await detailRes.json())?.isSuccess, 'estate detail isSuccess').toBeTruthy();
        test.info().annotations.push({
          type: 'observed',
          description:
            `API cross-check: estate ${openedFile} → caseId ${match!.caseId}; ` +
            `classification ${match!.classification ?? '-'}; ` +
            `EM=${match!.estateManagerName ?? '?'} RM=${match!.relationshipManagerName ?? '?'}; detail GET 200`,
        });
      } finally {
        await api.ctx.dispose();
      }
    });

    await step('8. cross-check via DB — the cases row matches the on-screen file number', async () => {
      // DB layer: SELECT-only against live [Case].CourtCases (the `Case` schema is a T-SQL
      // reserved word, so it is bracketed). Runs only when the CloudBeaver-relay CB_* creds
      // exist; otherwise records a clean db-skipped note (the UI + API parts above already
      // ran, so the journey is not skipped).
      if (!dbAvailable()) {
        test.info().annotations.push({
          type: 'db-skipped',
          description: `CB_* not set — DB cross-check of estate ${openedFile} skipped (UI+API verification stands)`,
        });
        return;
      }
      const { rows, rowCount } = await dbQuery<{ file_number: string; classification: string | null }>(
        'SELECT file_number, classification FROM [Case].CourtCases WHERE file_number = $1',
        [openedFile],
      );
      expect(rowCount, `exactly one [Case].CourtCases row for ${openedFile}`).toBe(1);
      expect(rows[0].file_number).toBe(openedFile);
      test.info().annotations.push({
        type: 'db-verified',
        description: `[Case].CourtCases: file_number=${rows[0].file_number}, classification=${rows[0].classification ?? '-'}`,
      });
    });
  });
});
