import { test } from '@playwright/test';

/**
 * JF-425 — تأكيد الورثة (heirs confirmation via the liquidator's Inventory Tasks). Backlog, Sprint-13.
 *
 * The whole story is liquidator-scoped: a liquidator assigned to an estate in the
 * Heirs-Inventory phase opens side menu → "Inventory Tasks" (مهام الحصر) →
 * "Heirs Confirmation" (تأكيد الورثة), reviews/edits the MoJ-integrated deceased+heirs
 * table, verifies every person, and the estate moves to Asset Confirmation.
 *
 * Live probe (2026-07-19, CIT): NOTHING of this surface exists yet —
 *   - the liquidator Nafath session (NID 1100000011) is bounced by authGuard to
 *     /service-providers/companies (JF-946/JF-1020 class), with no side menu at all;
 *   - no Inventory-Tasks section exists on any portal;
 *   - the related internal heirs screen (بيانات الورثة tab + forms/match API) is a
 *     different story (JF-444) and is already guarded by forms-match-rbac-api.spec.ts.
 * → every scenario is a fixme skeleton. When implemented, drive them with the
 *   liquidator Nafath login (loginViaNafath, NATIONAL_IDS.liquidator, 'مزود الخدمة') or
 *   move the spec to a liquidator-storageState project folder.
 *
 * Preconditions to seed: liquidator assigned to an estate in Heirs Inventory phase with
 * MoJ data (heirs determination deed + heirs + deceased) and task status
 * "Pending Heirs Confirmation" (golden assigned estate so far: INH00016).
 */

function annotateStory(): void {
  test.info().annotations.push({ type: 'story', description: 'JF-425' });
}

test.describe('JF-425 Heirs confirmation', () => {
  test.fixme('@high AC1 side menu displays the Inventory Tasks section for an assigned liquidator', async ({ page }) => {
    annotateStory();
    // Arrange: liquidator Nafath session; estate assigned, Heirs-Inventory phase.
    // Act: open the liquidator portal side navigation.
    // Assert: a section "مهام الحصر" (Inventory Tasks) is displayed.
    // Blocked today by the authGuard bounce (JF-946/JF-1020): liquidators land on
    // /service-providers/companies and never see a case-side menu.
  });

  test.fixme('@high AC2 Heirs Confirmation appears as an item under Inventory Tasks', async ({ page }) => {
    annotateStory();
    // Arrange: as AC1.
    // Assert: item "تأكيد الورثة" (Heirs Confirmation) listed under مهام الحصر;
    //         selecting it retrieves the assigned inheritance and opens it.
  });

  test.fixme('@blocker AC3+AC4 MoJ-integrated deceased and heirs render in one unified table', async ({ page }) => {
    annotateStory();
    // Arrange: open Heirs Confirmation for the assigned estate.
    // Act: the system calls the Ministry of Justice integration for deceased + heirs
    //      (heirs-listing integration; cf. GET inhaatdeeds/api/v1/HeirsListing/Deceased?socialId=…
    //      documented in JF-243, and ENDPOINTS.heirsListingStatus(caseId) for status).
    // Assert: ALL persons (deceased + every heir) appear in a SINGLE unified table
    //         (business rule 3), with the deed data loaded.
  });

  test.fixme('@high AC5 only predefined/nullable fields are editable; phone & email can be filled for heirs', async ({ page }) => {
    annotateStory();
    // Arrange: unified table rendered.
    // Assert: fields retrieved non-null from the integration are read-only;
    //         only nullable retrieved values are editable (business rule 6);
    //         phone number and email are fillable per heir (business rule 5);
    //         custom added fields are always text-typed (business rule 4).
  });

  test.fixme('@high AC6 no deletion is possible for heirs or deceased records', async ({ page }) => {
    annotateStory();
    // Assert: no delete action is rendered on any row (business rule 1), and any
    //         delete attempt via API returns 4xx (verify endpoint once built — the
    //         pack's apiDelete helper can probe it read-safely on a dedicated seed).
  });

  test.fixme('@blocker AC7+AC8 verifying all persons completes the task and moves the estate to Asset Confirmation', async ({ page }) => {
    annotateStory();
    // NOTE: mutates estate state — run on a dedicated seeded estate, not a shared fixture.
    // Arrange: unified table with N unverified persons.
    // Act: click the verification mark on each person; each verified row shows ✔.
    // Assert: submission is blocked until ALL persons are verified (business rule 2);
    //         once all are verified the task status becomes Completed automatically and
    //         the inheritance moves to the Asset Confirmation phase
    //         (cross-check via GET /cases/api/v1/court-cases/{id} status).
  });

  test.fixme('@medium AC9 SLA is configurable and breach sends the three staged reminders', async ({ page }) => {
    annotateStory();
    // Arrange: SLA duration configured in system configuration (not hardcoded).
    // Assert: on SLA breach the system sends the 1st reminder, then the 2nd, then the
    //         3rd/final reminder with the message
    //         "يرجى استكمال نموذج الإفصاح رقم ({Disclosure ID}) وإرساله في أقرب وقت ممكن".
    // Verify via the notifications feed / notification schema; requires a controllable
    // (short) SLA config on CIT to be testable.
  });
});
