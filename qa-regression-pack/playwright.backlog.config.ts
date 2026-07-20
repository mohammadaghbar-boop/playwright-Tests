import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Whole-System Coverage Map runner.
 *
 * The 198 files under `tests-backlog/` hold one `@fe`/`@be`/`@db` scenario stub per
 * JF story (the full-system map, ~809 scenarios). They are `test.fixme` placeholders —
 * a story that isn't built yet has no implementation — so a run enumerates them as
 * **pending/skipped**, by design. As each feature ships, its stubs get filled in and
 * start actually exercising FE/BE/DB.
 *
 * Run:  npm run test:backlog          (executes — everything reports pending/skipped)
 *       npm run test:backlog:list     (just lists the 809 scenarios)
 * No auth/globalSetup needed — the stubs don't log in until they're implemented.
 * Bundled Chromium; add --headed once real UI stubs exist.
 */
export default defineConfig({
  testDir: './tests-backlog',
  timeout: 60_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com',
    locale: 'ar-SA',
    trace: 'off',
    screenshot: 'off',
    ...devices['Desktop Chrome'],
    channel: undefined, // bundled Chromium
  },
});
