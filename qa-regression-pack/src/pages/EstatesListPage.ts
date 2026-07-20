import { Locator, Page, expect } from '@playwright/test';

/**
 * Page Object for the Estates List (`/court-cases`) and estate detail tabs — the JF-22
 * feature backbone. Selectors live here, not in specs; methods express intent.
 *
 * Mirrors the team suite's Automation-Tests/pages/EstatesListPage.ts (the ground-truth
 * POM) and adds the live-proven selectors exercised by the real-life estate-manager
 * journey: the التصنيف (JF-464) + المصفي (JF-415) columns, the row عرض (view) action,
 * and the four estate-detail tabs. Uses baseURL-relative paths (never hardcodes the
 * portal URL), getByRole/getByPlaceholder-first, and web-first waits.
 */
export class EstatesListPage {
  static readonly PATH = '/court-cases';

  /** The four estate-detail tabs (بيانات التركة exists only on the detail screen). */
  static readonly DETAIL_TABS = ['بيانات التركة', 'بيانات الورثة', 'الأصول', 'سجل التركة'] as const;

  constructor(private readonly page: Page) {}

  private searchInput(): Locator {
    // The live list search box; team POM uses input[placeholder*="رقم"], the journey uses
    // the exact placeholder. Prefer the exact one, fall back to the structural match.
    return this.page
      .getByPlaceholder('رقم الملف أو اسم المورث...')
      .or(this.page.locator('input[placeholder*="رقم"]'))
      .first();
  }

  /** Navigate to the estates list and wait for data rows. */
  async goto(): Promise<void> {
    await this.page.goto(EstatesListPage.PATH, { waitUntil: 'domcontentloaded' });
    await this.waitForTableData();
  }

  /** Web-first wait for the main data table to have at least one row (no networkidle). */
  async waitForTableData(timeout = 20_000): Promise<void> {
    await expect(this.rows().first()).toBeVisible({ timeout });
  }

  /** All rendered data rows. */
  rows(): Locator {
    return this.page.locator('table tbody tr');
  }

  /** The التصنيف (classification) column header — JF-464. */
  classificationHeader(): Locator {
    return this.page.getByRole('columnheader', { name: 'التصنيف' });
  }

  /** The المصفي (liquidator) column header — JF-415. */
  liquidatorHeader(): Locator {
    return this.page.getByRole('columnheader', { name: 'المصفي' });
  }

  /** Type an estate number into the search box, submit (بحث), and wait for the row. */
  async searchByEstateNumber(estateNumber: string): Promise<void> {
    const input = this.searchInput();
    await input.fill(estateNumber);
    await this.page.getByRole('button', { name: 'بحث', exact: true }).first().click().catch(() => undefined);
    await expect(this.page.getByRole('row', { name: new RegExp(estateNumber) }).first()).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Open the first reachable estate from a list of candidate file numbers, like a user:
   * search, click that row's عرض (view) action, and confirm the detail tabs render.
   * Returns the opened file number, or null if none of the candidates were reachable.
   */
  async openEstate(candidates: readonly string[]): Promise<string | null> {
    for (const file of candidates) {
      await this.page.goto(EstatesListPage.PATH, { waitUntil: 'domcontentloaded' });
      const box = this.searchInput();
      await box.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined);
      await box.fill(file).catch(() => undefined);
      await this.page.getByRole('button', { name: 'بحث', exact: true }).first().click().catch(() => undefined);

      const row = this.page.getByRole('row', { name: new RegExp(file) }).first();
      try {
        await row.waitFor({ state: 'visible', timeout: 10_000 });
      } catch {
        continue; // not visible to this user — try the next candidate
      }
      const viewBtn = row.getByRole('button', { name: 'عرض' });
      if (await viewBtn.count()) {
        await viewBtn.click().catch(() => undefined);
      } else {
        await row.click().catch(() => undefined);
      }
      if (await this.detailOpen()) return file;
    }
    return null;
  }

  /** True once an estate detail screen is on screen (بيانات التركة renders only there). */
  async detailOpen(): Promise<boolean> {
    return this.page
      .getByText('بيانات التركة', { exact: false })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
  }
}
