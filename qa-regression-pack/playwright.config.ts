import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * JF Regression Pack — self-contained config.
 * Uses the system Edge channel so no Playwright browser download is required
 * (the CIT QA machines already have Edge; this also matches the main suite's
 * Desktop Edge projects).
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
  },
  projects: [
    {
      name: 'public',
      testMatch: ['08-public/**/*.spec.ts'],
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'internal', // PD / internal-portal specs
      testMatch: ['01-auth/**/*.spec.ts', '02-admin/**/*.spec.ts', '04-estate-core/**/*.spec.ts', '06-assets-classification/**/*.spec.ts'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: '.auth/pd.json',
      },
    },
    {
      name: 'service-provider',
      testMatch: ['03-sp-lifecycle/**/*.spec.ts'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: '.auth/sp.json',
      },
    },
    {
      name: 'liquidator',
      testMatch: ['07-liquidator/**/*.spec.ts'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: '.auth/liquidator.json',
      },
    },
    {
      name: 'heir',
      testMatch: ['05-heirs/**/*.spec.ts'],
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: '.auth/heir.json',
      },
    },
  ],
});
