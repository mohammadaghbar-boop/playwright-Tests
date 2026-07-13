import { test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com';
const NATIONAL_ID = '1084039438';

function decodeJwt(token: string): unknown {
  const payload = token.split('.')[1];
  const json = Buffer.from(payload, 'base64url').toString('utf8');
  return JSON.parse(json);
}

test('nafath login as second user, inspect state', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(`${BASE_URL}/nafath-login`);
  await page.waitForLoadState('networkidle');

  await page.getByTestId('portal-card-service-providers').click().catch(async () => {
    await page.getByText(/service provider|مقدم/i).first().click();
  });

  await page.waitForURL((url) => !url.href.startsWith(BASE_URL), { timeout: 20_000 });
  await page.waitForLoadState('domcontentloaded');

  const nafathLink = page.getByRole('link', { name: /nafath|نفاذ/i });
  if (await nafathLink.count()) {
    await nafathLink.first().click();
    await page.waitForLoadState('domcontentloaded');
  }

  const idInput = page.locator('input[type="text"], input[type="tel"], input#username, input[name*="national" i], input[name*="id" i]').first();
  if (await idInput.count()) {
    await idInput.fill(NATIONAL_ID);
    await page.getByRole('button', { name: /تسجيل الدخول|log ?in|submit|دخول/i }).first().click();
  }

  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  await page.waitForURL((url) => url.href.startsWith(BASE_URL), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: 'Automation-Tests/nafath2-1-final.png', fullPage: true });

  console.log(`FINAL_URL=${page.url()}`);

  const cookies = await page.context().cookies();
  for (const c of cookies) {
    if (/access.?token/i.test(c.name)) {
      try {
        console.log(`DECODED_${c.name}=${JSON.stringify(decodeJwt(c.value))}`);
      } catch {
        console.log(`COOKIE_${c.name}_NOT_A_JWT`);
      }
    }
  }

  // Look for company cards / empty state on the companies page
  await page.goto(`${BASE_URL}/service-providers/companies`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'Automation-Tests/nafath2-2-companies.png', fullPage: true });
  const bodyText = await page.locator('body').innerText();
  console.log(`COMPANIES_PAGE_TEXT_SNIPPET=${bodyText.slice(0, 800).replace(/\n/g, ' | ')}`);
});
