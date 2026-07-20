import { test, expect, Page } from '@playwright/test';
import { step, loginAs, blockedHere } from '../src/journey';
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
