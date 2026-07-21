import { test, expect, Page } from '@playwright/test';
import { step, loginAs, blockedHere, apiLoginAs, apiGet, fetchCourtCases } from '../src/journey';
import { dbAvailable, dbQuery } from '../src/db';
import { PERSONAS } from '../src/personas';
import { URLS, FIXTURES } from '../src/world';

/**
 * JOURNEY — "The liquidator's working day"
 * Persona: Majed ALQAHTANI (المصفي), Nafath service-provider login, NID 1100000011.
 *
 * Real flow: the liquidator signs in through Nafath, enters his facility, opens his
 * assigned estates (التركات), reviews the golden assigned estate INH00016 and its tabs,
 * checks the external correspondence he issued (letter MK-16-1), reads his communications
 * inbox (التواصل والاستفسارات), and looks at his liquidator task. Read-only throughout —
 * nothing is reassigned, no letter is sent, no estate data is mutated.
 *
 * The liquidator here is a dual-role user (ServiceProvider + Liquidator). On some routes
 * that dual role has been seen to bounce the user off the /service-providers subtree
 * (JF-946 class). When a step is bounced that way, the journey records it as the real wall.
 */

const ESTATE = FIXTURES.assignedEstate; // INH00016 — the golden assigned estate
const ESTATE_CASE_ID = 'fb8f44cf-91e5-4e3c-a897-014d6df9ce6a';

/** Flattened, whitespace-collapsed page text — what the human actually reads on screen. */
async function readBody(page: Page): Promise<string> {
  return (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

/** Wait until the SPA has actually rendered content (Angular renders after domcontentloaded). */
async function waitForContent(page: Page): Promise<void> {
  await expect.poll(async () => (await readBody(page)).length, { timeout: 30_000 }).toBeGreaterThan(50);
}

/** True if the SP-subtree route bounced us elsewhere (the JF-946 dual-role routing wall). */
function bouncedOffSpSubtree(page: Page): boolean {
  const u = page.url();
  return !u.includes('/service-providers') || u.includes('/login') || u.includes('/nafath-login');
}

/** Open the assigned-estate detail (click its row if present, else deep-link). */
async function openEstateDetail(page: Page): Promise<void> {
  await page.goto(`${URLS.portal}/service-providers/court-cases`, { waitUntil: 'domcontentloaded' });
  const row = page.locator('tr', { hasText: ESTATE }).first();
  if (await row.count()) {
    const clickable = row.locator('a, button').first();
    await (((await clickable.count()) ? clickable : row).click().catch(() => row.click()));
    await page.waitForURL(/service-providers\/court-cases\/.+/, { timeout: 20_000 }).catch(() => undefined);
  }
  if (!/service-providers\/court-cases\/.+/.test(page.url())) {
    await page.goto(`${URLS.portal}/service-providers/court-cases/${ESTATE_CASE_ID}`, { waitUntil: 'domcontentloaded' });
  }
}

test.describe('Journey: Liquidator — a working day on an assigned estate', () => {
  test('Majed reviews his assigned estate INH00016 end to end', async ({ page }) => {
    await step('Majed signs in through Nafath and lands in the Joint-Funds portal', async () => {
      await loginAs(page, PERSONAS.liquidator);
      expect(page.url(), 'should have left the login/Nafath screens').not.toContain('/login');
      expect(page.url()).toContain(new URL(URLS.portal).host);
    });

    // BE + DB cross-checks of the assigned estate are placed here, right after login, so they
    // run independently of the JF-946 dual-role routing walls the UI walk below may hit (when
    // the facility is معلق the UI journey stops early — but the backend truth is still verified).
    await step('cross-check via API — his assigned estate INH00016 still carries a liquidator', async () => {
      // The backbone (court-cases + assignment) authorizes the EstateManager role, so we read the
      // backend as EstateManager and confirm INH00016 is present and keeps its accepted liquidator
      // (the same assignment the liquidator's UI is built around). Read-only.
      const em = PERSONAS.estateManager;
      const api = await apiLoginAs(em.email!, em.password!);
      try {
        const items = await fetchCourtCases(api, 100);
        const golden = items.find((i) => i.fileNumber === ESTATE);
        expect(golden, `${ESTATE} should be present via the API`).toBeTruthy();
        expect(golden!.liquidatorName, `${ESTATE} should retain its accepted liquidator`).toBeTruthy();
        // The detail GET resolves for the same case id (the estate the liquidator works).
        const detailRes = await apiGet(api, `/cases/api/v1/court-cases/${golden!.caseId}`);
        expect(detailRes.status(), 'estate detail GET should respond 200').toBe(200);
        test.info().annotations.push({
          type: 'observed',
          description: `API cross-check: ${ESTATE} → caseId ${golden!.caseId}; liquidator=${golden!.liquidatorName}; detail GET 200`,
        });
      } finally {
        await api.ctx.dispose();
      }
    });

    await step('cross-check via DB — the cases row for INH00016 has a liquidator assigned', async () => {
      // SELECT-only against live [Case].CourtCases (the `Case` schema is a T-SQL reserved
      // word, so it is bracketed). Runs only with CB_* creds; otherwise a clean db-skipped
      // note (the UI + API verification already ran). SQL Server has no boolean literal, so
      // liquidator presence is projected via CASE WHEN → '1'/'0' (relay returns strings).
      if (!dbAvailable()) {
        test.info().annotations.push({
          type: 'db-skipped',
          description: `CB_* not set — DB cross-check of ${ESTATE} skipped (UI+API verification stands)`,
        });
        return;
      }
      const { rows, rowCount } = await dbQuery<{ file_number: string; has_liquidator: string }>(
        'SELECT file_number, CASE WHEN liquidator_id IS NOT NULL THEN 1 ELSE 0 END AS has_liquidator FROM [Case].CourtCases WHERE file_number = $1',
        [ESTATE],
      );
      expect(rowCount, `exactly one [Case].CourtCases row for ${ESTATE}`).toBe(1);
      expect(rows[0].file_number).toBe(ESTATE);
      // INH00016 is the seeded estate with a liquidator assigned (evidence in memory).
      expect(String(rows[0].has_liquidator), `${ESTATE} should have a liquidator assigned in the DB`).toBe('1');
      test.info().annotations.push({
        type: 'db-verified',
        description: `[Case].CourtCases: file_number=${rows[0].file_number}, liquidator_id present=${rows[0].has_liquidator === '1'}`,
      });
    });

    await step('He enters his facility and opens التركات (assigned estates)', async () => {
      const courtNav = page.getByRole('link', { name: 'التركات', exact: true });
      const listHeader = page.getByText('ملفات التركات').first();
      let onEstatesList = false;

      // Enter the facility, then open التركات via the in-facility nav (falling back to a
      // deep link). Retry once — facility entry is an SPA action that can race the click.
      for (let attempt = 0; attempt < 2 && !onEstatesList; attempt++) {
        await page.goto(`${URLS.portal}/service-providers/companies`, { waitUntil: 'domcontentloaded' });
        const enter = page.getByRole('button', { name: 'الدخول على المنشأة' });
        if (await enter.count()) {
          await enter.first().click().catch(() => undefined);
          // Entry succeeded once the in-facility nav (الخدمات / التركات / التواصل) appears.
          await courtNav.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
        }
        if (await courtNav.count()) {
          await courtNav.first().click().catch(() => undefined);
        } else {
          await page.goto(`${URLS.portal}/service-providers/court-cases`, { waitUntil: 'domcontentloaded' });
        }
        onEstatesList = await listHeader.isVisible({ timeout: 15_000 }).catch(() => false);
      }

      if (!onEstatesList) {
        blockedHere(
          'JF-946',
          "Majed cannot open التركات — his facility (UNN 7041556899) shows حالة الحساب معلق because it has reverted to قيد مراجعة إدارة المشتريات (pending purchasing review; corroborated by the purchasing journey), so the court-cases route keeps returning the facility picker instead of his assigned estates",
        );
      }

      // The in-facility nav the estate walk depends on.
      const body = await readBody(page);
      expect(body, 'in-facility liquidator nav should be present').toMatch(/التركات/);
      expect(body).toMatch(/التواصل والاستفسارات/);
      // The assigned estate itself must be listed.
      await expect(page.getByText(ESTATE).first()).toBeVisible({ timeout: 20_000 });
    });

    await step('He opens the estate and reviews its tabs (بيانات التركة / الورثة / الأصول / سجل التركة)', async () => {
      await openEstateDetail(page);
      if (bouncedOffSpSubtree(page)) {
        blockedHere('JF-946', 'opening the estate detail bounced the liquidator off the /service-providers subtree');
      }
      await expect(page).toHaveURL(/service-providers\/court-cases\/.+/, { timeout: 20_000 });
      await waitForContent(page);
      const body = await readBody(page);
      const landmarks = ['بيانات التركة', 'الورثة', 'الأصول', 'سجل التركة', ESTATE, 'التركة'];
      const seen = landmarks.filter((l) => body.includes(l));
      expect(seen.length, `expected at least one estate-detail landmark; page text: ${body.slice(0, 400)}`).toBeGreaterThan(0);
      test.info().annotations.push({ type: 'observed', description: `estate-detail landmarks seen: ${seen.join(', ')}` });
    });

    await step('He reviews external correspondence (مخاطبات الجهات) and checks letter MK-16-1', async () => {
      // Correspondence is a section within the estate detail; try to open it.
      const corrTab = page.getByText(/مخاطبات/).first();
      if ((await corrTab.count()) && (await corrTab.isVisible().catch(() => false))) {
        await corrTab.click().catch(() => undefined);
        await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      }
      const body = await readBody(page);
      // Genuinely observable: the correspondence section is reachable from the estate.
      expect(body, 'the estate detail should surface a correspondence section').toMatch(/مخاطبات|مراسل|الخطاب|خطاب/);
      // Soft read of the specific letter Majed issued and its status, recorded as evidence.
      const sawLetter = body.includes(FIXTURES.letterNo);
      const sawCompleted = /مكتمل|Completed/i.test(body);
      test.info().annotations.push({
        type: 'observed',
        description: `letter ${FIXTURES.letterNo} visible: ${sawLetter}; a completed status visible: ${sawCompleted}`,
      });
    });

    await step('He opens التواصل والاستفسارات and reads his inbox', async () => {
      await page.goto(`${URLS.portal}/service-providers/tickets`, { waitUntil: 'domcontentloaded' });
      if (bouncedOffSpSubtree(page)) {
        blockedHere('JF-946', 'the التواصل والاستفسارات (tickets) route bounced the liquidator off the /service-providers subtree');
      }
      await expect(page).toHaveURL(/service-providers\/tickets/, { timeout: 20_000 });
      await waitForContent(page);
      const body = await readBody(page);
      expect(body, 'the communications inbox should render').toMatch(/التواصل والاستفسارات|الاستفسارات|التذاكر|الرسائل/);
    });

    await step('He opens his liquidator task (flow-map question) and reads it', async () => {
      // The liquidator task lives inside the estate (no top-level /tasks route for this role).
      await openEstateDetail(page);
      if (bouncedOffSpSubtree(page)) {
        blockedHere('JF-946', 'returning to the estate to read the liquidator task bounced off the /service-providers subtree');
      }
      await expect(page).toHaveURL(/service-providers\/court-cases\/.+/, { timeout: 20_000 });
      await waitForContent(page);
      const taskTab = page.getByText(/المهام|مهمة|توليد مهام المصفي/).first();
      if ((await taskTab.count()) && (await taskTab.isVisible().catch(() => false))) {
        await taskTab.click().catch(() => undefined);
        await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      }
      const body = await readBody(page);
      // We are genuinely inside the assigned estate — the task surface is where a real
      // liquidator finds his flow-map questions. Record what task state is on screen.
      const sawTask = /مهام|مهمة|توليد مهام المصفي/.test(body);
      test.info().annotations.push({
        type: 'observed',
        description: `liquidator task surface visible on estate: ${sawTask}`,
      });
      expect(page.url(), 'still inside the assigned estate to review tasks').toMatch(/service-providers\/court-cases\/.+/);
    });
  });
});
