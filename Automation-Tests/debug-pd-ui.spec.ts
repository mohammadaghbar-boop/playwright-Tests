/**
 * Debug: capture what the PD user actually sees on the portal.
 * Run: npx playwright test debug-pd-ui --headed
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'pd.json') });

test('DEBUG | PD details — capture network requests to find real API URL', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/') || url.includes('infath')) {
      apiRequests.push(`${req.method()} ${url}`);
    }
  });
  page.on('response', res => {
    const url = res.url();
    if (url.includes('/api/') || url.includes('infath')) {
      apiRequests.push(`  → ${res.status()} ${url}`);
    }
  });

  // Navigate directly to the known details page UUID from previous debug
  await page.goto(`${BASE_URL}/service-providers-list/3b0a1c9a-32e5-4808-b162-c2d58adcb5be`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('=== Network requests ===\n', apiRequests.join('\n'));
  console.log('=== URL ===', page.url());

  const body = await page.locator('body').innerText();
  console.log('=== Body (first 2000 chars) ===\n', body.slice(0, 2000));

  const tabs = await page.locator('button').allInnerTexts();
  console.log('=== Buttons on details page ===', tabs.filter(t => t.trim()));
});
