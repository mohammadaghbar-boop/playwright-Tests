import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { EstatesListPage } from './pages/EstatesListPage';

/**
 * FE / UI companion to the API-first JF-172 and JF-363 specs.
 *
 * The sibling specs (`JF-172-liquidator-assignment.spec.ts`,
 * `JF-363-assignment-response.spec.ts`) assert the assignment flow at the API + DB
 * layer only. This spec verifies the same OUTCOMES at the layer the estate manager
 * actually sees — the `/court-cases` list and the estate detail page — per the
 * standing lesson: *verify findings at the UI layer, not just the API/DB*.
 *
 * It reads already-existing, real evidence estates (no mutation, no fabricated data):
 *   INH00016 — assignment sent, liquidator Majed ALQAHTANI ACCEPTED (req_status=2)
 *              → estate progressed to the work phase «حصر التركة».
 *   INH00018 — assignment sent, liquidator REJECTED (req_status=3)
 *              → liquidator cleared, estate back in the assignment phase «اسناد التركة».
 *
 * The interactive accept/reject *action* screen (a liquidator clicking accept/reject on a
 * PENDING request) is NOT covered here: producing a fresh pending request is gated by
 * JF-717 — see the `test.fixme` cases in the sibling API specs (`@blocked-JF717`).
 */

test.use({ baseURL: process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com' });

const ESTATE_MANAGER = {
  email: process.env.ESTATE_MANAGER_EMAIL ?? 'demo-estate-manager@azm.sa',
  password: process.env.ESTATE_MANAGER_PASSWORD ?? 'Azm@123',
};

const ACCEPTED = {
  number: 'INH00016',
  liquidator: 'Majed ALQAHTANI',
  detailId: 'fb8f44cf-91e5-4e3c-a897-014d6df9ce6a',
  workStatus: 'حصر التركة', // estate-inventory / work phase reached after acceptance
} as const;

const REJECTED = {
  number: 'INH00018',
  deceased: 'R3RJ2', // anchor text proving the detail page loaded
  detailId: '65c123a5-7ce8-4c8b-9660-ca7bb85fe2f0',
  assignStatus: 'اسناد التركة', // reassignment phase reached after rejection
} as const;

test.describe('JF-172 / JF-363 — liquidator assignment (FE / UI)', () => {
  test.beforeEach(async ({ page }) => {
    await new LoginPage(page).login(ESTATE_MANAGER);
  });

  test('JF-172 · accepted estate surfaces its assigned liquidator in the estates list', async ({ page }) => {
    const estates = new EstatesListPage(page);
    await estates.goto();
    await estates.searchByEstateNumber(ACCEPTED.number);

    const row = page.locator('table tbody tr').filter({ hasText: ACCEPTED.number }).first();
    // The assignment request (JF-172) produced a liquidator that the FE now shows for the estate.
    await expect(row, 'assigned liquidator name is rendered in the estate row').toContainText(
      ACCEPTED.liquidator,
    );
    // Acceptance (JF-363) moved the estate on to the work phase.
    await expect(row, 'accepted estate has progressed past assignment').toContainText(
      ACCEPTED.workStatus,
    );
  });

  test('JF-363 · rejected estate shows no active liquidator and is back in assignment', async ({ page }) => {
    const estates = new EstatesListPage(page);
    await estates.goto();
    await estates.searchByEstateNumber(REJECTED.number);

    const row = page.locator('table tbody tr').filter({ hasText: REJECTED.number }).first();
    // Rejection (JF-363) cleared the liquidator — the row must not carry the rejecter's name.
    await expect(row, 'no active liquidator is shown after rejection').not.toContainText('ALQAHTANI');
    // …and the estate is back in the assignment phase for reassignment.
    await expect(row, 'rejected estate returned to the assignment phase').toContainText(
      REJECTED.assignStatus,
    );
  });

  test('JF-363 · estate detail exposes the liquidator only for the accepted estate', async ({ page }) => {
    // Accepted estate detail — the assigned liquidator is present.
    await page.goto(`/court-cases/${ACCEPTED.detailId}`);
    await expect(
      page.getByText(ACCEPTED.liquidator).first(),
      'accepted estate detail shows the liquidator',
    ).toBeVisible({ timeout: 15_000 });

    // Rejected estate detail — loads (anchor on the deceased name) but carries no liquidator.
    await page.goto(`/court-cases/${REJECTED.detailId}`);
    await expect(
      page.getByText(REJECTED.deceased).first(),
      'rejected estate detail loaded',
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('body'),
      'rejected estate detail carries no liquidator name',
    ).not.toContainText('ALQAHTANI');
  });
});
