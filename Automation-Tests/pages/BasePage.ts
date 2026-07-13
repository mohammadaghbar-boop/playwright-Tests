import { Page, expect } from '@playwright/test';

/**
 * Base class for all Page Objects. Holds the Playwright `page` and a few shared,
 * web-first helpers. Feature pages extend this and expose intent-level methods
 * (e.g. `searchByEstateNumber`) so specs never touch raw selectors.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /** Web-first wait for the main data table to have at least one row (no networkidle). */
  async waitForTableData(timeout = 15_000): Promise<void> {
    await expect(this.page.locator('table tbody tr').first()).toBeVisible({ timeout });
  }
}
