import { test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com';
const NATIONAL_ID = '1084039438';

function decodeJwt(token: string): unknown {
  const payload = token.split('.')[1];
  const json = Buffer.from(payload, 'base64url').toString('utf8');
  return JSON.parse(json);
}

test('nafath login retry for second user', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(`${BASE_URL}/nafath-login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  await page.getByTestId('portal-card-service-providers').click().catch(async () => {
    await page.getByText(/service provider|مقدم/i).first().click();
  });

  await page.waitForURL((url) => !url.href.startsWith(BASE_URL), { timeout: 20_000 });
  await page.waitForLoadState('domcontentloaded');

  const idInput = page.locator('input[type="text"], input[type="tel"]').first();
  await idInput.fill(NATIONAL_ID);
  await page.screenshot({ path: 'Automation-Tests/nafath2b-1-before-submit.png', fullPage: true });

  // Wait a bit for any stale "active login request" to expire, then try up to 3 times.
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await page.waitForTimeout(3000);
    const stillHere = await page.getByText(/active login request/i).isVisible().catch(() => false);
    if (!stillHere) break;
    console.log(`attempt ${attempt} still blocked, waiting...`);
    await page.waitForTimeout(5000);
  }

  await page.waitForLoadState('domcontentloaded');
  await page.screenshot({ path: 'Automation-Tests/nafath2b-2-after-submit.png', fullPage: true });

  await page.waitForURL((url) => url.href.startsWith(BASE_URL), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: 'Automation-Tests/nafath2b-3-final.png', fullPage: true });

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

  await page.goto(`${BASE_URL}/service-providers/companies`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'Automation-Tests/nafath2b-4-companies.png', fullPage: true });
});
