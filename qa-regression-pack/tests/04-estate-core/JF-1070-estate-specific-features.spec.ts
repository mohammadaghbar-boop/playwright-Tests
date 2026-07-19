import { test, expect } from '@playwright/test';

/**
 * JF-1070 — Access Estate-Specific Features (estate-scoped التواصل والاستفسارات /
 * المراجعة القانونية entry points). Backlog, Sprint-13.
 *
 * Live probe (2026-07-19, CIT, EstateManager session):
 *   - /court-cases list → estate detail (/court-cases/{caseId}) renders with sections
 *     بيانات التركة، بيانات الورثة، الأصول، محرك توليد المهام، مهام التركة، سجل التركة،
 *     القضايا والتنفيذ، المخاطبات والدراسات القانونية، صك الحكم، الوصايا والحقوق، المرفقات;
 *   - the reusable feature page التواصل والاستفسارات exists at /tickets (استفسار جديد +
 *     inquiries table).
 * The JF-1070 additions — estate-page entry points that open /tickets or المراجعة
 * القانونية pre-filtered to the estate with a read-only estate field — are NOT built
 * yet → fixme skeletons. The existing surfaces they build on are guarded live.
 */

function annotateStory(): void {
  test.info().annotations.push({ type: 'story', description: 'JF-1070' });
}

test.describe('JF-1070 Access estate-specific features', () => {
  test('@blocker estate detail opens from the estates list with its feature sections', async ({ page }) => {
    annotateStory();
    // The story's entry point is "opens an estate from the Estates module" — guard it.
    await page.goto('/court-cases');
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.waitFor();
    const viewAction = firstRow.locator('a, button').filter({ hasText: 'عرض' }).first();
    if (await viewAction.count()) {
      await viewAction.click();
    } else {
      await firstRow.locator('a').first().click();
    }
    await page.waitForURL(/\/court-cases\/[0-9a-fA-F-]{36}/);
    // Estate-scoped sections available today (the JF-1070 features will sit beside them).
    for (const section of ['بيانات التركة', 'بيانات الورثة', 'سجل التركة', 'مهام التركة']) {
      await expect(page.getByText(section, { exact: true }).first()).toBeVisible();
    }
  });

  test('@high the reusable التواصل والاستفسارات feature page renders (BR-002 target)', async ({ page }) => {
    annotateStory();
    // BR-002/BR-008: no new page — the estate entry point must reuse THIS page.
    await page.goto('/tickets');
    await expect(page.getByRole('heading', { name: 'التواصل والاستفسارات' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'استفسار جديد' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'رقم الاستفسار' })).toBeVisible();
  });

  test.fixme('@high estate page displays the authorized estate-specific feature entry points (BR-005)', async ({ page }) => {
    annotateStory();
    // Arrange: open an estate detail (/court-cases/{caseId}).
    // Assert: the estate page offers the entry points التواصل والاستفسارات and
    //         المراجعة القانونية (exact placement per Figma node 9275-124197);
    //         only features the logged-in user is authorized for are displayed (BR-005).
    // Note: today the detail page has a المخاطبات والدراسات القانونية section but no
    //       استate-scoped التواصل والاستفسارات / المراجعة القانونية entry points.
  });

  test.fixme('@blocker التواصل والاستفسارات from an estate opens the existing page filtered to that estate (BR-001/BR-003)', async ({ page }) => {
    annotateStory();
    // Arrange: estate detail of a case with a known fileNumber (e.g. INH00018) and
    //          inquiries existing for it AND for other estates.
    // Act: click التواصل والاستفسارات on the estate page.
    // Assert: the EXISTING /tickets page opens (same route/component — BR-002/BR-008,
    //         likely /tickets?caseId=… or estate-scoped route: capture when built);
    //         the estate is applied as the active filter automatically (BR-003);
    //         every listed inquiry belongs to the selected estate only (BR-001).
  });

  test.fixme('@high المراجعة القانونية from an estate opens the existing page filtered to that estate (BR-001/BR-003)', async ({ page }) => {
    annotateStory();
    // Arrange: estate detail; legal-review records exist for this and other estates.
    // Act: click المراجعة القانونية on the estate page.
    // Assert: the existing legal-review page opens (no separate estate page — BR-002),
    //         pre-filtered to the selected estate; records of other estates absent.
    // Note: no standalone legal-review side-menu route exists on CIT yet (legal content
    //       lives in the estate's المخاطبات والدراسات القانونية section) — capture the
    //       real route when the feature lands.
  });

  test.fixme('@high inquiry form estate field is pre-filled and read-only when opened from an estate (BR-006)', async ({ page }) => {
    annotateStory();
    // Arrange: reach التواصل والاستفسارات via an estate page.
    // Act: click استفسار جديد (button exists on /tickets today) to open the inquiry form.
    // Assert: the Estate dropdown is displayed pre-filled with the selected estate and
    //         is READ-ONLY (disabled) — the user cannot change the estate (BR-006).
  });

  test.fixme('@high legal-review request form estate field is pre-filled and read-only when opened from an estate (BR-007)', async ({ page }) => {
    annotateStory();
    // Arrange: reach المراجعة القانونية via an estate page.
    // Act: open the legal-review request form.
    // Assert: the Estate dropdown is pre-filled with the selected estate and read-only;
    //         the user cannot change the selected estate (BR-007).
  });

  test.fixme('@medium existing functionality and permissions remain unchanged inside the estate context (BR-004)', async ({ page }) => {
    annotateStory();
    // Arrange: open التواصل والاستفسارات both from the side menu and from an estate.
    // Assert: the same actions (استفسار جديد، عرض، tab switching, filters) are available
    //         in both entries; only the displayed records differ (estate-filtered vs all).
    //         Role permissions identical in both contexts.
  });
});
