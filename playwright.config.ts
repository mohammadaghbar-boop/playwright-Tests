import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
  timeout: 60000,
  testDir: './TestByAghbar',
  fullyParallel: true,
  workers: 1,
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
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 2. Login specs — no storageState (test the login flow itself)
    {
      name: 'login-tests',
      testMatch: '**/JF-*/01-login.spec.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 3. SP feature specs — reuse SP storageState
    //    Covers every JF-XXX-story-name/ subfolder automatically
    //    Excludes JF-167 (heir portal — different storageState)
    {
      name: 'e2e',
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
      testMatch: '**/heir-auth.setup.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 5. Heir login spec — no storageState
    {
      name: 'heir-login-tests',
      testMatch: '**/JF-167-*/01-*.spec.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 6. Heir feature specs — reuse heir storageState
    {
      name: 'heirs-e2e',
      testMatch: ['**/JF-167-*/0[2-9]-*.spec.ts', '**/JF-167-*/[1-9][0-9]-*.spec.ts'],
      dependencies: ['heir-setup'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: 'TestByAghbar/.auth/heir.json',
      },
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
