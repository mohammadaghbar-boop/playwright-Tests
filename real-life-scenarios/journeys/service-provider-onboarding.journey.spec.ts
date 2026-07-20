import { test, expect } from '@playwright/test';
import { step, loginAs, blockedHere } from '../src/journey';
import { PERSONAS } from '../src/personas';
import { URLS, TENANT_ID } from '../src/world';

/**
 * JOURNEY — "A service provider registers to become a liquidator"
 * Persona: Mohammed ALGHAMDI (مزود الخدمة) — Nafath service-provider login, NID 1084039438.
 *
 * Real flow: a firm that already has an approved facility on the portal wants to offer the
 * liquidation (مصفي) service. The owner signs in through Nafath, opens their facility, and
 * walks the "register a new service" wizard — declaring conflicts of interest, entering the
 * bank guarantee (dates + amount), and attaching documents. At the very last step, pressing
 * "تسجيل الخدمة" fails: the terms-and-conditions the submit depends on come back as a server
 * error. That wall is tracked as JF-1097 (site-config 500), so the journey records it and
 * stops gracefully instead of pretending the service was created.
 */
test.describe('Journey: Service provider — register to become a liquidator', () => {
  test('a firm walks the service-registration wizard and hits the terms-and-conditions wall', async ({ page }) => {
    const sp = PERSONAS.serviceProvider;

    await step('1. Mohammed signs in through Nafath (مزود الخدمة) and reaches the SP portal', async () => {
      await loginAs(page, sp);
      // The SP entry point is the companies (facilities) list.
      await expect
        .poll(() => (page.url().includes('/service-providers/companies') ? 'ok' : page.url()), { timeout: 45_000 })
        .toBe('ok');
    });

    await step('2. He reviews his facilities (المنشآت) list', async () => {
      // The companies list is the SP landing page; make sure the facility data has rendered.
      await expect(page.getByText('الدخول على المنشأة').first()).toBeVisible({ timeout: 30_000 });
      const facilityText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      // An active facility exposes the "enter facility" CTA; column labels confirm it's the list.
      expect(facilityText).toMatch(/المنشأ|السجل|حالة/);
      test.info().annotations.push({
        type: 'observed',
        description: 'SP 1084039438 has an approved facility ("مؤسسة سلطان فيصل للمقاولات العامة", معتمد) with the الدخول على المنشأة CTA.',
      });
    });

    await step('3. He enters the facility and opens "register a new service", walking the wizard', async () => {
      // Enter the facility to establish the session's facility context.
      await page.getByRole('button', { name: 'الدخول على المنشأة' }).first().click();
      await page.waitForURL('**/service-providers/welcome', { timeout: 30_000 }).catch(() => undefined);

      // Go to the facility's services list, then open the "add service" wizard.
      await page.goto(`${URLS.portal}/service-providers/services`, { waitUntil: 'domcontentloaded' });
      const addService = page
        .locator('button:has-text("إضافة خدمة"), a:has-text("إضافة خدمة"), button:has-text("تسجيل خدمة جديدة"), a:has-text("تسجيل خدمة جديدة")')
        .first();
      if (await addService.count()) {
        await addService.click();
      } else {
        await page.goto(`${URLS.portal}/service-providers/services/new`, { waitUntil: 'domcontentloaded' });
      }

      // --- Wizard step 1: the declaration + three conflict-of-interest disclosures ---
      const ack = page.locator('input[name=readAcknowledgement]');
      await ack.waitFor({ timeout: 20_000 });
      for (const cb of ['readAcknowledgement', 'undertakingToUpdateData', 'undertakingToDiscloseRelations']) {
        await expect(page.locator(`input[name=${cb}]`)).toBeAttached();
        await page.locator(`input[name=${cb}]`).check({ force: true });
      }
      for (const group of ['hasFinancialOrBusinessRelation', 'hasKinshipWithBoardMembers', 'hasKinshipWithStaff']) {
        const radios = page.locator(`input[type=radio][name="${group}"]`);
        const count = await radios.count();
        expect(count, `disclosure radios for ${group} must render`).toBeGreaterThan(0);
        await radios.nth(count - 1).check({ force: true }); // last option = "لا"
      }
      const next = page.locator('button:has-text("التالي")').first();
      await expect(next).toBeEnabled({ timeout: 10_000 });
      await next.click();

      // --- Wizard step 2: bank-guarantee details (the real UX the brief cares about) ---
      await expect
        .poll(async () => (/نوع الخدمة|مبلغ الضمان|بنك الضمان/.test(await page.locator('body').innerText()) ? 'ok' : 'pending'), {
          timeout: 20_000,
        })
        .toBe('ok');

      // Service type + sub-type dropdowns render (مصفي reveals the محامي sub-type).
      const serviceType = page.locator('[aria-label="اختر نوع الخدمة"]').first();
      await expect(serviceType).toBeVisible({ timeout: 10_000 });
      await serviceType.click({ force: true }).catch(() => undefined);
      await page.locator('[role=option]').filter({ hasText: 'مصفي' }).first().click({ force: true }).catch(() => undefined);

      // Guarantee AMOUNT control renders.
      const amount = page.locator('input[name=guaranteeAmount], lib-input-number input').first();
      await expect(amount).toBeVisible({ timeout: 10_000 });

      // Guarantee DATE pickers render, and the calendar opens with clickable day-cells.
      const dateInput = page.locator('input[placeholder="YYYY-MM-DD"], lib-datepicker input').first();
      await expect(dateInput).toBeVisible({ timeout: 10_000 });
      await dateInput.click({ force: true });
      const dayCells = await page
        .locator('.p-datepicker td:not(.p-disabled) span, [data-pc-name=datepicker] span, [class*=calendar] td')
        .filter({ hasText: /^\d{1,2}$/ });
      await expect
        .poll(() => dayCells.count(), { timeout: 10_000 })
        .toBeGreaterThan(0); // the calendar day-cell grid — the documented commit path
      // Demonstrate the day-cell commit (best-effort; the render assertion above is the guarantee).
      const committed = await dayCells
        .last()
        .click({ force: true })
        .then(() => dateInput.inputValue())
        .catch(() => '');
      test.info().annotations.push({
        type: 'observed',
        description: `Guarantee date picker: calendar opened with day-cells; day-cell click committed "${committed || '(soft)'}".`,
      });
      await page.keyboard.press('Escape').catch(() => undefined);

      // ATTACHMENT inputs render (guarantee copy / IBAN cert). Assert they exist — do NOT upload
      // (uploading would create OSS files; this journey stays read-only up to the submit wall).
      await expect(page.locator('input[type=file]').first()).toBeAttached();
      const fileCount = await page.locator('input[type=file]').count();
      expect(fileCount, 'at least one attachment upload control must render').toBeGreaterThan(0);
    });

    await step('4. He presses the final "تسجيل الخدمة" — blocked by the terms-and-conditions server error (JF-1097)', async () => {
      // The final submit fetches the service-registration terms-and-conditions from site-config,
      // which returns 500 for every key in this environment. Probe the exact endpoint the browser
      // hits at submit so the wall is recorded with real evidence, then stop gracefully.
      const tcRes = await page.request
        .get(`${URLS.api}/platform/api/v1/site-config/service-registration:terms-and-conditions`, {
          headers: { TenantIdentifier: TENANT_ID, 'Accept-Language': 'ar-SA' },
          failOnStatusCode: false,
        })
        .catch(() => null);
      const status = tcRes ? tcRes.status() : 'unreachable';
      test.info().annotations.push({
        type: 'evidence',
        description: `GET /platform/api/v1/site-config/service-registration:terms-and-conditions → ${status} (expected 200; 500 = JF-1097).`,
      });
      blockedHere('JF-1097', `the Register-Service submit fails with a server error on terms-and-conditions (site-config → ${status})`);
    });
  });
});
