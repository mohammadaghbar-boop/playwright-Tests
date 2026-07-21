import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Scoped, isolated run config for the JF-172/363 FE spec. Deliberately omits the
// Nafath `globalSetup` (email/password login is used here, not Nafath) so an unrelated
// mock-login hiccup cannot block or mask this spec — the "verify in isolation" lesson.
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: '.',
  testMatch: ['Automation-Tests/JF-172-363-liquidator-assignment-ui.spec.ts'],
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Edge'],
    channel: 'msedge',
    baseURL: process.env.BASE_URL,
    locale: 'ar-SA',
    screenshot: 'off', // house rule: no screenshots
    video: 'off',
    trace: 'off',
  },
});
