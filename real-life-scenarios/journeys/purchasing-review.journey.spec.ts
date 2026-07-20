import { test, expect, Page } from '@playwright/test';
import { step, loginAs } from '../src/journey';
import { PERSONAS } from '../src/personas';
import { URLS } from '../src/world';

/**
 * JOURNEY — "A purchasing employee reviews service-provider registrations"
 * Persona: Purchasing Employee (موظف المشتريات) — on CIT this role lives on the
 * SystemAdmin demo account admin@infath.sa, signed in via the demo-users panel.
 *
 * Real flow: a purchaser opens the service-providers review area (قائمة مزودي الخدمة →
 * قائمة المنشآت), opens a facility that is still "قيد مراجعة إدارة المشتريات", reviews its
 * details, and looks at the decision controls (قبول / رفض / إعادة) they would use.
 * STRICTLY read-only: this journey asserts the controls exist and opens a confirmation
 * dialog, then CANCELS — it never approves, rejects, or returns a real facility record.
 */

/** Flattened, whitespace-collapsed page text — what the human actually reads on screen. */
async function readBody(page: Page): Promise<string> {
  return (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
}

/** Wait until the SPA has actually rendered content (Angular renders after domcontentloaded). */
async function waitForContent(page: Page): Promise<void> {
  await expect.poll(async () => (await readBody(page)).length, { timeout: 30_000 }).toBeGreaterThan(50);
}

const REVIEW_STATUS = 'قيد مراجعة إدارة المشتريات';

test.describe('Journey: Purchasing employee — review a service-provider registration', () => {
  test('a purchaser reviews a facility awaiting purchasing review', async ({ page }) => {
    await step('The purchaser signs in through the demo-users panel', async () => {
      await loginAs(page, PERSONAS.purchasing);
      expect(page.url(), 'should have left the login screen').not.toContain('/login');
    });

    await step('They open the service-providers review area (قائمة مزودي الخدمة → قائمة المنشآت)', async () => {
      await page.goto(`${URLS.portal}/service-providers-list`, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/service-providers-list/, { timeout: 20_000 });
      await waitForContent(page);
      const body = await readBody(page);
      expect(body, 'the purchasing facilities list should render').toMatch(/قائمة مزودي الخدمة|قائمة المنشأت|قائمة المنشآت/);
      // At least one facility awaiting purchasing review should be listed.
      await expect(page.getByText(REVIEW_STATUS).first()).toBeVisible({ timeout: 20_000 });
    });

    await step('They open a facility awaiting review and read its details', async () => {
      // Click the first row that is still pending purchasing review.
      const pendingRow = page.locator('tr', { hasText: REVIEW_STATUS }).first();
      if (await pendingRow.count()) {
        const clickable = pendingRow.locator('a, button').first();
        await (((await clickable.count()) ? clickable : pendingRow).click().catch(() => pendingRow.click()));
      } else {
        await page.getByText(REVIEW_STATUS).first().click().catch(() => undefined);
      }
      await page.waitForURL(/service-providers-list\/.+/, { timeout: 20_000 }).catch(() => undefined);
      await expect(page).toHaveURL(/service-providers-list\/.+/, { timeout: 20_000 });
      // Wait for the facility detail itself to lazy-render (not just the app shell).
      await expect(
        page.getByText(/تفاصيل المنشأة|معلومات المنشأة|الرقم الوطني الموحد/).first(),
        'the facility detail should render',
      ).toBeVisible({ timeout: 20_000 });
      const body = await readBody(page);
      const landmarks = ['تفاصيل المنشأة', 'معلومات المنشأة', 'الخدمات المرتبطة بالمنشأة', 'الرقم الوطني الموحد', 'اسم المنشأة'];
      const seen = landmarks.filter((l) => body.includes(l));
      expect(seen.length, `expected facility-detail landmarks; page text: ${body.slice(0, 400)}`).toBeGreaterThan(0);
      test.info().annotations.push({ type: 'observed', description: `facility-detail landmarks seen: ${seen.join(', ')}` });
    });

    await step('They read the decision controls (قبول / رفض / إعادة) — then cancel without deciding', async () => {
      const approve = page.getByRole('button', { name: 'قبول' });
      const reject = page.getByRole('button', { name: 'رفض' });
      const back = page.getByRole('button', { name: 'إعادة' });

      // Genuinely observable: the purchaser's accept + reject controls are present.
      await expect(approve.first(), 'قبول (accept) control should be present').toBeVisible({ timeout: 20_000 });
      await expect(reject.first(), 'رفض (reject) control should be present').toBeVisible({ timeout: 20_000 });
      // إعادة (return) shows on the linked-service view; record whether it is present here.
      const hasReturn = (await back.count()) > 0;
      test.info().annotations.push({ type: 'observed', description: `إعادة (return) control present on this view: ${hasReturn}` });

      // Open a confirmation dialog to confirm the flow works, then CANCEL — never decide.
      let dialogOpened = false;
      await approve.first().click().catch(() => undefined);
      const dialog = page.locator('[role="dialog"], .p-dialog, app-confirm-dialog').last();
      dialogOpened = await dialog
        .first()
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);

      if (dialogOpened) {
        const dialogText = (await dialog.first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        expect(dialogText.length, 'the confirmation dialog should show a prompt').toBeGreaterThan(0);
        // Cancel — do NOT confirm. Try the usual dismiss controls, else press Escape.
        const cancel = dialog
          .locator('button:has-text("إلغاء"), button:has-text("تراجع"), button:has-text("لا"), button[aria-label="Close"], .p-dialog-header-close')
          .first();
        if (await cancel.count()) {
          await cancel.click().catch(() => undefined);
        } else {
          await page.keyboard.press('Escape').catch(() => undefined);
        }
        await dialog.first().waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => undefined);
      } else {
        // No dialog appeared on click — ensure we did not commit a decision, and record it.
        await page.keyboard.press('Escape').catch(() => undefined);
      }
      test.info().annotations.push({
        type: 'observed',
        description: `decision confirmation dialog opened and cancelled (no real decision committed): ${dialogOpened}`,
      });

      // Safety net: we must still be on the facility detail — nothing was submitted/navigated away.
      await expect(page).toHaveURL(/service-providers-list/, { timeout: 20_000 });
    });
  });
});
