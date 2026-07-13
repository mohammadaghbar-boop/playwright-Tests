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
     e2e/ fixture set). */
  testMatch: ['tests/**/*.spec.ts', 'Automation-Tests/**/*.spec.ts'],
  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Logs in as each role once and caches auth state to .auth/ so specs that
     need a logged-in session don't each pay for their own Nafath login. */
  globalSetup: './Automation-Tests/global-setup.ts',

  /* Closes the shared DB pool (Automation-Tests/utils/db-client.ts) once the
     whole run finishes, so DB-asserting specs don't leak open connections. */
  globalTeardown: './Automation-Tests/global-teardown.ts',

  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {  video: 'retain-on-failure',

    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },{
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      }},

  

    

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
