import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Dedicated config for the pure-API JF-575 suite (jf-575-inquiry-authorities-api.spec.ts).
 *
 * Why a separate config: those tests authenticate by reading the real, still-valid access
 * token that global-setup.ts already saved to .auth/liquidator.json (24h lifetime) and send
 * it as an Authorization: Bearer header — they never drive a browser. So they must NOT pay for
 * (or be blocked by) the main config's globalSetup, whose Nafath mock re-login is flaky and, more
 * to the point, entirely unnecessary here. No globalSetup, no globalTeardown (no DB pool used).
 *
 * Run:  npx playwright test -c playwright.api.config.ts
 * Prereq: .auth/liquidator.json exists with a non-expired token (run the main suite's
 *         global-setup once — or any successful run of the UI spec — to produce it).
 */
export default defineConfig({
  timeout: 60000,
  testDir: '.',
  testMatch: ['Automation-Tests/**/*-api.spec.ts'],
  fullyParallel: true,
  reporter: 'html',
  use: {
    ignoreHTTPSErrors: true, // API host presents a self-signed cert in the chain
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
