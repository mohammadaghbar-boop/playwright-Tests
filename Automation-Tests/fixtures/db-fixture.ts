import { test as base } from '@playwright/test';
import { query } from '../utils/db-client';

/** The shape exposed to tests via the `db` fixture. */
export interface DbFixture {
  query: typeof query;
}

/**
 * Extends the base Playwright `test` with a `db` fixture so any spec can assert
 * database state after driving a UI action, e.g.:
 *
 *   import { test, expect } from '../fixtures/db-fixture';
 *
 *   test('creates a row correctly', async ({ page, db }) => {
 *     await page.goto('/some-form');
 *     ...
 *     const { rows } = await db.query('SELECT * FROM some_table WHERE id = $1', [id]);
 *     expect(rows).toHaveLength(1);
 *   });
 *
 * The fixture does NOT open a new connection per test — it hands out the same
 * query function backed by the shared singleton pool in `utils/db-client.ts`.
 * The pool itself is closed exactly once via globalTeardown (see
 * `Automation-Tests/global-teardown.ts`), not here.
 */
export const test = base.extend<{ db: DbFixture }>({
  db: async ({}, use) => {
    await use({ query });
  },
});

export { expect } from '@playwright/test';
