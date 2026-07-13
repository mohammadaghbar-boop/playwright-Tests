import { Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for the Estates List (`/court-cases`) — the JF-22 feature.
 * Selectors live here, not in specs; methods express intent.
 */
export class EstatesListPage extends BasePage {
  static readonly PATH = '/court-cases';

  private readonly searchInput = (): Locator =>
    this.page.locator('input[placeholder*="رقم"]').first();

  /** Navigate to the estates list and wait for data rows. */
  async goto(): Promise<void> {
    await this.page.goto(EstatesListPage.PATH);
    await this.waitForTableData();
  }

  /** All rendered data rows. */
  rows(): Locator {
    return this.page.locator('table tbody tr');
  }

  /** The estate number in the first cell of the first row. */
  async firstEstateNumber(): Promise<string> {
    return (await this.rows().first().locator('td').first().innerText()).trim();
  }

  /** Type an estate number into the search box, submit, and wait for results. */
  async searchByEstateNumber(estateNumber: string): Promise<void> {
    const input = this.searchInput();
    await input.fill(estateNumber);
    await input.press('Enter');
    await expect(this.rows().first()).toBeVisible({ timeout: 15_000 });
  }
}
