import { test, expect, Page } from '@playwright/test';
import { step, loginAs, blockedHere } from '../src/journey';
import { PERSONAS } from '../src/personas';
import { URLS } from '../src/world';

/**
 * JOURNEY — "An heir checks the estates they're part of"
 * Persona: Omar ALMUTAIRI, a registered heir (Nafath individual, NID 1133154595).
 *
 * Real flow: Omar signs in through Nafath's "الأفراد" (individuals) path, lands on the
 * heir dashboard, and walks his own portal the way a real heir would — التركات (the
 * estates he's linked to), التواصل والاستفسارات (his tickets), and finally the
 * الإفصاحات → إضافة إفصاح flow to try to file a disclosure.
 *
 * This heir has no estate linked to him (a real, valid state), so the disclosure flow
 * hits a wall at the inheritance chooser — recorded via blockedHere so the journey
 * documents the true end-user experience instead of red-failing.
 */

const HEIR_ROUTES = {
  dashboard: '/heirs/dashboard',
  estates: '/heirs/court-cases',
  disclosures: '/heirs/disclosures',
  tickets: '/heirs/tickets',
} as const;

/** Open a heir-portal page the way a user does — click the sidebar link, fall back to the route. */
async function openHeirPage(page: Page, linkName: string, route: string): Promise<void> {
  const link = page.getByRole('link', { name: linkName, exact: false }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click().catch(() => undefined);
    await page.waitForURL((u) => u.href.includes(route), { timeout: 20_000 }).catch(() => undefined);
  }
  if (!page.url().includes(route)) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
  }
  await expect.poll(() => page.url().includes(route), { timeout: 15_000 }).toBe(true);
}

test.describe('Journey: Heir — checks the estates he is part of', () => {
  test('a registered heir signs in and looks for his estates', async ({ page }) => {
    const heir = PERSONAS.heir;

    await step('1. Omar signs in with Nafath (الأفراد) and reaches the heir portal', async () => {
      await loginAs(page, heir);
      expect(page.url(), 'should be on the portal, not the login screen').toContain(URLS.portal.replace(/^https?:\/\//, ''));
      expect(page.url()).not.toContain('/login');
    });

    await step('2. He lands on the heir dashboard (لوحة معلومات الورثة) and reads it', async () => {
      await openHeirPage(page, 'لوحة المعلومات', HEIR_ROUTES.dashboard);
      await expect(page.getByText('لوحة معلومات الورثة').first()).toBeVisible();
      // The heir sidebar shows his four sections — this is his whole world.
      await expect(page.getByRole('link', { name: 'التركات', exact: false }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'الإفصاحات', exact: false }).first()).toBeVisible();
    });

    await step('3. He opens التركات (my estates) — sees which estates he is linked to', async () => {
      await openHeirPage(page, 'التركات', HEIR_ROUTES.estates);
      const main = page.getByRole('main');
      // The estates-list page renders (heading + search); the rows tell him what he is linked to.
      await expect(main.getByRole('heading', { name: 'ملفات التركات' })).toBeVisible();
      const body = (await main.innerText()).replace(/\s+/g, ' ');
      const hasEstates = /INH\d{5}/.test(body);
      test.info().annotations.push({
        type: 'observed',
        description: hasEstates
          ? 'التركات shows one or more linked estate files'
          : 'التركات renders the estates-list scaffold with an empty results table — this heir has no estate linked to him (a valid real state)',
      });
    });

    await step('4. He opens التواصل والاستفسارات (tickets) and reads it', async () => {
      await openHeirPage(page, 'التواصل والاستفسارات', HEIR_ROUTES.tickets);
      expect(page.url()).toContain('/heirs/tickets');
      // The tickets page renders content in the heir shell (list or empty state).
      const main = page.getByRole('main');
      await expect(main).toBeVisible();
      const body = (await main.innerText()).replace(/\s+/g, ' ');
      expect(body.length, 'tickets page should render some content').toBeGreaterThan(0);
      test.info().annotations.push({
        type: 'observed',
        description: /INQ|تذكرة|استفسار|لا توجد|لا يوجد/.test(body)
          ? `tickets section rendered: "${body.slice(0, 80)}"`
          : `tickets page loaded: "${body.slice(0, 80)}"`,
      });
    });

    await step('5. He tries to add a disclosure (الإفصاحات → إضافة إفصاح)', async () => {
      await openHeirPage(page, 'الإفصاحات', HEIR_ROUTES.disclosures);
      // Empty-state list with the primary action, exactly as a first-time heir sees it.
      const addBtn = page.getByRole('button', { name: 'إضافة إفصاح', exact: false }).first();
      await expect(addBtn).toBeVisible();
      await addBtn.click();
      await page.waitForURL((u) => u.href.includes('/heirs/disclosures/new'), { timeout: 20_000 }).catch(() => undefined);

      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const chooserEmpty = /لا توجد ملفات تركات|لا توجد ملفات|لا توجد تركات/.test(body);
      const chooserHasEstate = /INH\d{5}/.test(body);

      if (chooserEmpty || !chooserHasEstate) {
        // The disclosure form opens, but the "اختر التركة/الإرث" chooser has nothing to pick:
        // this heir is not linked to any estate, so he simply cannot file a disclosure.
        blockedHere(
          'no linked estate',
          'the "إضافة إفصاح" form opens but the inheritance chooser is empty ("لا توجد ملفات تركات") — the heir has no estate to disclose against, so he cannot proceed',
        );
      }

      // If a future data setup DOES link an estate, the next real wall is the attachment
      // upload path (documented, read-only: assert the form is there, do not submit).
      test.info().annotations.push({ type: 'observed', description: 'inheritance chooser has at least one estate' });
      blockedHere(
        'JF-757',
        'an inheritance can be selected, but submitting a disclosure with an attachment is the documented wall (silent draft / upload-chunked 500) — not exercised to avoid a mutating submit',
      );
    });
  });
});
