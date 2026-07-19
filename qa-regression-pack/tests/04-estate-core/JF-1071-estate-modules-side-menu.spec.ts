import { test, expect } from '@playwright/test';

/**
 * JF-1071 — Access Estate Modules from Side Menu (الأصول، مهام التركة، القضايا على
 * التركة، المخاطبات الخارجية as cross-estate side-menu modules). Backlog, Sprint-13.
 *
 * Live probe (2026-07-19, CIT, EstateManager session) — side menu today:
 *   لوحة المعلومات، مؤشرات أداء المصفي، التركات، قضايا التركات (/cases — LIVE),
 *   مقترحات القسمة، المطالبات والالتزامات، الحقوق والمستحقات، التواصل والاستفسارات،
 *   الدليل والمراجع + disabled "قريبا" stubs: الأصول، طلبات التنفيذ، مزادات التركات،
 *   مخاطبات الجهات.
 * So of the four JF-1071 modules only the estate-cases module is reachable from the
 * side menu today (/cases renders a cross-estate table with search + filters).
 * الأصول and المخاطبات الخارجية are "قريبا" stubs and مهام التركة exists only inside
 * the estate detail → fixme skeletons.
 */

function annotateStory(): void {
  test.info().annotations.push({ type: 'story', description: 'JF-1071' });
}

test.describe('JF-1071 Access estate modules from side menu', () => {
  test('@high قضايا التركات module opens from the side menu with records across estates (BR-001/BR-002)', async ({ page }) => {
    annotateStory();
    await page.goto('/dashboard');
    await page.getByRole('link', { name: 'قضايا التركات' }).click();
    await page.waitForURL(/\/cases/);
    await expect(page.getByRole('heading', { name: 'قضايا التركات' }).first()).toBeVisible();
    // BR-010 direction: each record identifies its estate — live the table carries an
    // اسم التركة column (the dedicated Estate-Number column is asserted in the fixme below).
    await expect(page.getByRole('columnheader', { name: 'اسم التركة' })).toBeVisible();
    // BR-002: dataset spans ALL accessible estates — expect >1 distinct estate among rows.
    const rows = page.locator('table tbody tr');
    await rows.first().waitFor();
    const estateNameCellIndex = 6; // رقم القضية|الطرف|تاريخ القضية|نوع القضية|المحكمة|نوع المطالبة|اسم التركة|...
    const sample = Math.min(await rows.count(), 10);
    const estates = new Set<string>();
    for (let i = 0; i < sample; i++) {
      estates.add((await rows.nth(i).locator('td').nth(estateNameCellIndex).innerText()).trim());
    }
    expect(estates.size, 'side-menu entry must list cases across multiple estates, not one estate\'s subset').toBeGreaterThan(1);
  });

  test('@medium قضايا التركات module exposes search and filter functionality (BR-003/BR-004)', async ({ page }) => {
    annotateStory();
    await page.goto('/cases');
    await expect(page.getByRole('heading', { name: 'قضايا التركات' }).first()).toBeVisible();
    // Live filter bar: رقم القضية, date range, نوع القضية, اسم التركة, حالة القضية,
    // الحالة الفعلية + بحث / إعادة تعيين actions.
    await expect(page.getByRole('button', { name: 'بحث' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'إعادة تعيين' })).toBeVisible();
    await expect(page.getByText('نوع القضية').first()).toBeVisible();
    await expect(page.getByText('حالة القضية').first()).toBeVisible();
  });

  test.fixme('@high الأصول module is accessible from the side menu across estates', async ({ page }) => {
    annotateStory();
    // Today the side menu shows "الأصول قريبا" (disabled stub, href=null).
    // Act: click side menu → الأصول.
    // Assert: the existing assets module opens (asset data currently lives at
    //         /court-cases/{caseId}/assets/{assetId} — the side-menu page must reuse it,
    //         BR-008) listing assets across ALL accessible estates with no default
    //         estate filter (BR-009); estate number shown per record (BR-010).
    // API cross-check: ENDPOINTS.assetsByCaseGrouped(caseId) per estate.
  });

  test.fixme('@high مهام التركة module is accessible from the side menu across estates', async ({ page }) => {
    annotateStory();
    // Today مهام التركة exists only as a section inside the estate detail page —
    // there is no side-menu entry.
    // Act: click side menu → مهام التركة.
    // Assert: the existing estate-tasks page opens (BR-008) showing tasks across all
    //         accessible estates (BR-002), no default estate filter (BR-009), estate
    //         number per record (BR-010); all existing task actions preserved (BR-006).
  });

  test.fixme('@high المخاطبات الخارجية module is accessible from the side menu and hides إضافة جهة استعلام (BR-007)', async ({ page }) => {
    annotateStory();
    // Today the side menu shows "مخاطبات الجهات قريبا" (disabled stub); external
    // correspondence lives inside the estate detail (المخاطبات والدراسات القانونية).
    // Act: click side menu → المخاطبات الخارجية.
    // Assert: the existing correspondence page opens across all accessible estates;
    //         the "إضافة جهة استعلام" action is HIDDEN in this entry point (BR-007)
    //         while all other correspondence actions remain per permissions;
    //         estate number displayed per record (BR-010).
  });

  test.fixme('@medium side-menu entry applies no default estate filter, unlike the estate entry point (BR-008/BR-009)', async ({ page }) => {
    annotateStory();
    // Arrange: open the same module twice — from an estate page (JF-1070 entry) and
    //          from the side menu.
    // Assert: same page/route component both times (BR-008); estate entry is
    //         pre-filtered to the estate while the side-menu entry lists all estates
    //         with NO estate filter applied by default (BR-009); the user may then
    //         apply an estate filter manually.
  });

  test.fixme('@medium filters persist until cleared by the user (BR-005)', async ({ page }) => {
    annotateStory();
    // Arrange: side-menu module list (e.g. /cases).
    // Act: apply a filter (e.g. نوع القضية = تجارية) → بحث, navigate into a record and
    //      back (and/or paginate).
    // Assert: the applied filter is still active until إعادة تعيين / explicit clearing.
  });

  test.fixme('@medium empty state shows "لا توجد نتائج." when no records match (ES-001)', async ({ page }) => {
    annotateStory();
    // Act: apply a filter combination guaranteed to match nothing
    //      (e.g. رقم القضية = 0000000000) → بحث.
    // Assert: the list area shows exactly "لا توجد نتائج." (ES-001).
    // Note: the unfiltered heir estates list currently uses "لا توجد بيانات" as its
    //       empty state — the filtered-empty message per this story is "لا توجد نتائج."
  });
});
