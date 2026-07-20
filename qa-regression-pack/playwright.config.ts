import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * JF Regression Pack — self-contained config.
 * Runs on Playwright's own **bundled Chromium** (run `npx playwright install chromium`
 * once). Use `npm run test:headed` to watch the browser drive the app live, and
 * `SLOWMO=500 npx playwright test --headed <spec>` to slow it down for demos.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  // The Nafath mock rejects concurrent login requests for the same user
  // ("active login request already exists") — keep a single worker.
  workers: 1,
  retries: 1,
  globalSetup: './src/global-setup.ts',
  reporter: [
    ['html', { open: 'never' }],
    ['./src/reporting/priority-reporter.ts'],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com',
    locale: 'ar-SA',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off', // team policy: no screenshots
    // Optional slow-motion for headed demo runs: SLOWMO=500 npx playwright test --headed
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 },
  },
  projects: [
    {
      name: 'public',
      testMatch: ['08-public/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'], channel: undefined },
    },
    {
      name: 'internal', // PD / internal-portal specs
      testMatch: ['01-auth/**/*.spec.ts', '02-admin/**/*.spec.ts', '04-estate-core/**/*.spec.ts', '06-assets-classification/**/*.spec.ts', '09-erp-integrations/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        channel: undefined,
        storageState: '.auth/pd.json',
      },
    },
    {
      name: 'service-provider',
      testMatch: ['03-sp-lifecycle/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        channel: undefined,
        storageState: '.auth/sp.json',
      },
    },
    {
      name: 'liquidator',
      testMatch: ['07-liquidator/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        channel: undefined,
        storageState: '.auth/liquidator.json',
      },
    },
    {
      name: 'heir',
      testMatch: ['05-heirs/**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        channel: undefined,
        storageState: '.auth/heir.json',
      },
    },
  ],
});
