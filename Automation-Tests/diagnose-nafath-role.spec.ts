import { test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com';
const NATIONAL_ID = '1084039435';

function decodeJwt(token: string): unknown {
  const payload = token.split('.')[1];
  const json = Buffer.from(payload, 'base64url').toString('utf8');
  return JSON.parse(json);
}

test('nafath login as national id and inspect role claims', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(`${BASE_URL}/nafath-login`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'Automation-Tests/nafath-1-picker.png', fullPage: true });

  await page.getByTestId('portal-card-service-providers').click().catch(async () => {
    await page.getByText(/service provider|مقدم/i).first().click();
  });

  await page.waitForURL((url) => !url.href.startsWith(BASE_URL), { timeout: 20_000 });
  await page.waitForLoadState('domcontentloaded');
  await page.screenshot({ path: 'Automation-Tests/nafath-2-external.png', fullPage: true });

  const nafathLink = page.getByRole('link', { name: /nafath|نفاذ/i });
  if (await nafathLink.count()) {
    await nafathLink.first().click();
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'Automation-Tests/nafath-3-idp.png', fullPage: true });
  }

  const idInput = page.locator('input[type="text"], input[type="tel"], input#username, input[name*="national" i], input[name*="id" i]').first();
  if (await idInput.count()) {
    await idInput.fill(NATIONAL_ID);
    await page.screenshot({ path: 'Automation-Tests/nafath-4-filled.png', fullPage: true });
    await page.getByRole('button', { name: /تسجيل الدخول|log ?in|submit|دخول/i }).first().click();
  }

  await page.waitForLoadState('domcontentloaded');
  await page.screenshot({ path: 'Automation-Tests/nafath-5-after-submit.png', fullPage: true });

  // Facility selection step, if present
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'Automation-Tests/nafath-6-maybe-facility.png', fullPage: true });

  await page.waitForURL((url) => url.href.startsWith(BASE_URL), { timeout: 45_000 }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: 'Automation-Tests/nafath-7-final.png', fullPage: true });

  console.log(`FINAL_URL=${page.url()}`);

  const cookies = await page.context().cookies();
  for (const c of cookies) {
    if (/access.?token|jwt|auth/i.test(c.name)) {
      console.log(`COOKIE_NAME=${c.name}`);
      try {
        const decoded = decodeJwt(c.value);
        console.log(`DECODED_${c.name}=${JSON.stringify(decoded)}`);
      } catch {
        console.log(`COOKIE_${c.name}_NOT_A_JWT`);
      }
    }
  }
});
