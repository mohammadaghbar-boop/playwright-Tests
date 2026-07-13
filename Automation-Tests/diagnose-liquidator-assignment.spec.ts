import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com';

test('diagnose demo-liquidator assignment state and accept if pending', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill('demo-liquidator@azm.sa');
  await page.locator('input[type="password"]').fill('Azm@123');
  await page
    .getByRole('button', { name: /تسجيل الدخول|sign\s*in|log\s*in/i })
    .first()
    .click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

  await page.goto(`${BASE_URL}/court-cases`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'Automation-Tests/diag-1-case-list.png', fullPage: true });

  const acceptButtons = page.locator('[data-testid^="accept-"]');
  const acceptCount = await acceptButtons.count();
  console.log(`PENDING_ASSIGNMENT_ACCEPT_BUTTONS=${acceptCount}`);

  const rows = page.locator('table tbody tr');
  const rowCount = await rows.count();
  console.log(`TOTAL_CASE_ROWS=${rowCount}`);
  for (let i = 0; i < rowCount; i++) {
    const text = await rows.nth(i).innerText();
    console.log(`ROW_${i}: ${text.replace(/\n/g, ' | ')}`);
  }

  if (acceptCount > 0) {
    await acceptButtons.first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'Automation-Tests/diag-2-accept-dialog.png', fullPage: true });
    const confirmBtn = page.getByRole('button', { name: /تأكيد|قبول|confirm|accept/i }).last();
    await confirmBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'Automation-Tests/diag-3-after-accept.png', fullPage: true });
    console.log('ACCEPT_CLICKED=true');
  } else {
    console.log('ACCEPT_CLICKED=false (no pending assignment rows found)');
  }
});
