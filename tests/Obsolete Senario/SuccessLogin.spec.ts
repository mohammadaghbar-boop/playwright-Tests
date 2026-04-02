import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  test.setTimeout(70000);

  await page.goto('https://qa-infath-app.azm-dev.com/home');

  // click login button
  await page.getByRole('button', { name: 'تسجيل الدخول' }).first().click();

  await page.waitForTimeout(2000);

  // click first option
  await page.getByText('المزاود للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();


  // click second option
  await page.getByText('حساب فردي للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();


  // click Nafath
  await page.getByRole('link', { name: 'Nafath' }).click();


  await page.getByRole('textbox', { name: 'الرجاء إدخال رقم الهوية' }).click();
  await page.getByRole('textbox', { name: 'الرجاء إدخال رقم الهوية' }).fill('1112223334');
  await page.getByRole('button', { name: 'Mock Users' }).click();
  await page.getByText('Mohammed ALGHAMDI 1214421194 Active اختيار').click();
  await page.getByRole('button', { name: 'اختيار' }).nth(3).click();
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  await page.waitForURL('https://qa-infath-app.azm-dev.com/home');
  await expect(page).toHaveURL('https://qa-infath-app.azm-dev.com/home');


  await page.locator('div.bg-neutral-100', { hasText: 'ف' }).click();
  await page.waitForTimeout(10000);


});
