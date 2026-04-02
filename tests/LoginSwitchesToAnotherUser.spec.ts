import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://qa-infath-app.azm-dev.com/home');
  await page.getByRole('button', { name: 'Login تسجيل الدخول' }).click();
  await page.getByText('المزاود للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();
  await page.getByText('حساب فردي للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();
  await page.getByRole('textbox', { name: 'Username or email' }).click();
  await page.getByRole('textbox', { name: 'Username or email' }).fill('12345');
  await page.getByRole('link', { name: 'Nafath' }).click();

 // open users

 
 await page.getByRole('button', { name: 'Mock Users' }).click();

// wait until users appear (IMPORTANT)
const users = page.getByRole('button', { name: 'اختيار' });
await users.first().waitFor({ state: 'visible' });

const count = await users.count();

for (let i = 0; i < count; i++) {
  await users.nth(i).click();
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  const result = await Promise.race([
    page.waitForURL('**/home', { timeout: 100000 }).then(() => 'success'),
    page.getByText('An active login request already exists').waitFor({ timeout: 100000 }).then(() => 'error')
  ]);

  if (result === 'success') break;

  await page.getByRole('button', { name: 'Mock Users' }).click();
}

  await page.waitForURL('https://qa-infath-app.azm-dev.com/home');
  await expect(page).toHaveURL('https://qa-infath-app.azm-dev.com/home');

const profile = page.locator('div.bg-neutral-100');
await profile.first().waitFor({ state: 'visible' });
await profile.first().click();


await page.waitForTimeout(5000);

});