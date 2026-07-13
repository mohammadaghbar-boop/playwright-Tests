import { test } from '@playwright/test';
import * as path from 'node:path';

test.use({ storageState: path.join(__dirname, '..', '.auth', 'liquidator.json') });

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

test('debug: enter facility precisely then inspect side menu', async ({ page }) => {
  await page.goto(`${BASE_URL}/service-providers/companies`);
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'الدخول على المنشأة' }).click();
  await page.waitForURL('**/service-providers/welcome', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  console.log('AFTER_ENTER_FACILITY_URL=' + page.url());

  const bodyText = await page.locator('body').innerText();
  console.log('BODY_SNIPPET=' + bodyText.slice(0, 2000));

  await page.screenshot({ path: 'Automation-Tests/debug-after-enter-facility.png', fullPage: true });

  await page.getByText('التركات', { exact: true }).click();
  await page.waitForURL('**/service-providers/court-cases', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  console.log('AFTER_COURT_CASES_NAV_URL=' + page.url());

  // Now that selectedFacility is established, try a direct deep link to the specific
  // case's inquiries tab.
  const CASE_ID = '3b93081c-d5ca-4df8-abcb-914a526dcdac';
  await page.goto(`${BASE_URL}/service-providers/court-cases/${CASE_ID}?tab=inquiries`);
  await page.waitForLoadState('networkidle');
  console.log('DEEP_LINK_FINAL_URL=' + page.url());
  const section = page.getByTestId('inquiry-authorities-section');
  console.log('INQUIRY_SECTION_VISIBLE=' + (await section.isVisible({ timeout: 10_000 }).catch(() => false)));
  console.log('DEEP_LINK_BODY=' + (await page.locator('body').innerText()).slice(0, 1500));
  await page.screenshot({ path: 'Automation-Tests/debug-court-cases-list.png', fullPage: true });
});
