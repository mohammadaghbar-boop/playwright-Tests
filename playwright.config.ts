import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 *
 * Populates DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD (see .env.example) for
 * Automation-Tests/utils/db-client.ts. Silently no-ops if .env doesn't exist
 * (e.g. CI providing real env vars directly) — dotenv.config() never throws.
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
  timeout: 60000,
  testDir: '.',
  /* Previously testDir: './tests', which silently excluded Automation-Tests/ from
     every default/explicit-path invocation (Playwright scopes file discovery AND
     CLI path arguments to testDir). Scoped via testMatch instead of widening
     testDir's default full-repo scan, so this does NOT sweep into
     azm-joint-fund-portal/ or azm-joint-fund-backend/ (each has its own,
     incompatible test setup — Angular Karma specs + a different Playwright
     e2e/ fixture set). NOTE: the projects below that target TestByAghbar/ each
     set their own `testDir` override for the same reason — otherwise their
     broad auth.setup.ts glob patterns would also match unrelated files
     like azm-joint-fund-portal/e2e/auth.setup.ts once the global testDir widens
     to the repo root. */
  testMatch: ['tests/**/*.spec.ts', 'Automation-Tests/**/*.spec.ts'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  // Preserved from the TestByAghbar suite's own config — some of its specs hit the
  // Nafath mock's "active login request already exists" error under concurrency.
  // CLI runs that pass --workers explicitly (e.g. Automation-Tests specs) override this.
  workers: 1,

  /* Logs in as each role once and caches auth state to .auth/ so specs that
     need a logged-in session don't each pay for their own Nafath login. */
  globalSetup: './Automation-Tests/global-setup.ts',

  /* Closes the shared DB pool (Automation-Tests/utils/db-client.ts) once the
     whole run finishes, so DB-asserting specs don't leak open connections. */
  globalTeardown: './Automation-Tests/global-teardown.ts',

  reporter: 'html',
  use: {
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Service-provider portal ──────────────────────────────────────────────
    // 1. SP auth setup — logs in as Mohammed ALGHAMDI (service provider)
    {
      name: 'setup',
      testDir: './TestByAghbar',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 2. Login specs — no storageState (test the login flow itself)
    {
      name: 'login-tests',
      testDir: './TestByAghbar',
      testMatch: '**/JF-*/01-login.spec.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 3. SP feature specs — reuse SP storageState
    //    Covers every JF-XXX-story-name/ subfolder automatically
    //    Excludes JF-167 (heir portal — different storageState)
    {
      name: 'e2e',
      testDir: './TestByAghbar',
      testMatch: ['**/JF-*/0[2-9]-*.spec.ts', '**/JF-*/[1-9][0-9]-*.spec.ts'],
      testIgnore: '**/JF-167-*/**',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: 'TestByAghbar/.auth/user.json',
      },
    },

    // ── Heir portal (JF-167) ─────────────────────────────────────────────────
    // 4. Heir auth setup — logs in as heir via Nafath mock users
    {
      name: 'heir-setup',
      testDir: './TestByAghbar',
      testMatch: '**/heir-auth.setup.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 5. Heir login spec — no storageState
    {
      name: 'heir-login-tests',
      testDir: './TestByAghbar',
      testMatch: '**/JF-167-*/01-*.spec.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 6. Heir feature specs — reuse heir storageState
    {
      name: 'heirs-e2e',
      testDir: './TestByAghbar',
      testMatch: ['**/JF-167-*/0[2-9]-*.spec.ts', '**/JF-167-*/[1-9][0-9]-*.spec.ts'],
      dependencies: ['heir-setup'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: 'TestByAghbar/.auth/heir.json',
      },
    },

    // ── Automation-Tests/ suite (JF-171, jf157, jf575, etc.) ─────────────────
    // No per-project testDir/testMatch override — these rely on the global
    // testDir/testMatch above, and are normally run against an explicit file
    // path (e.g. `playwright test Automation-Tests/foo.spec.ts --project=chromium`).
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
