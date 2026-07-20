import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Real-Life Scenarios — end-to-end user journeys.
 *
 * Unlike the regression pack (per-feature guards, mostly API), each spec here is
 * ONE journey: a persona logging in and doing what a real user does, in sequence,
 * across many features — driven through the browser UI. So:
 *  - Each journey does its own UI login as step 1 (no shared storageState).
 *  - Single worker: the Nafath mock rejects concurrent same-user logins, and
 *    journeys share personas.
 *  - Generous timeout: journeys are long, multi-page walks.
 */
export default defineConfig({
  testDir: './journeys',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'evidence/journeys-result.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com',
    locale: 'ar-SA',
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off', // team policy: traces only, no screenshots
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'journeys',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
