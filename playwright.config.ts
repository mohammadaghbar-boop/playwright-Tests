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
    // 1. Auth setup — runs once, saves session to .auth/user.json
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 2. Login spec — does NOT reuse saved auth (tests the login flow itself)
    {
      name: 'login-tests',
      testMatch: '**/services-list/01-login.spec.ts',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // 3. All other services-list specs — reuse saved auth from setup
    {
      name: 'services-list',
      testMatch: '**/services-list/0[2-9]-*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: 'TestByAghbar/.auth/user.json',
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
