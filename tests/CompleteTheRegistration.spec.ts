import { test, expect } from '@playwright/test';

test('test', async ({ page , context}) => {
  await page.goto('https://qa-infath-app.azm-dev.com/home');
  await page.getByRole('button', { name: 'Login تسجيل الدخول' }).click();
  await page.getByText('المزاود للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();
  await page.getByText('حساب فردي للأفراد الذين يرغبون بالمشاركة بالمزادات الدخول بنفاذ').click();
  await page.getByRole('link', { name: 'Nafath' }).click();

  // open users
/*
  await page.getByRole('textbox', { name: 'الرجاء إدخال رقم الهوية' }).click();
  await page.getByRole('textbox', { name: 'الرجاء إدخال رقم الهوية' }).fill('1286201977');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
*/

// try to open Mock Users

//const users = ['1344265265', '1031898399', '2895543521', '1796181070','1286201977'];


const start = 180;
const end = 183;

for (let i = start; i <= end; i++) {
  await page.getByRole('button', { name: 'Mock Users' }).click();
  await page.locator(`div:nth-child(${i}) > div:nth-child(2) > .user-select-btn`).click();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  // check if failed (adjust selector to your actual error message)
  const hasError = await page.getByText('An active login request already exists for this identity number.').isVisible();
  if (!hasError) {
    break; // success → stop trying
  }
}


await page.waitForURL('https://qa-infath-app.azm-dev.com/register?type=individual');

const phone = `+9665${Math.floor(10000000 + Math.random() * 90000000)}`;
await page.getByPlaceholder('+9660000000000').fill(phone);

await page.getByRole('button', { name: 'إنشاء حساب' }).click();



const notifPage = await context.newPage();
await notifPage.goto('https://qa-infath-mocks.azm-dev.com/notifications.html');


const locator = notifPage.locator('text=رمز التحقق').first();

await locator.waitFor();

const text = await locator.innerText();
const otp = text.match(/\d{4}/)?.[0];
console.log('OTP:', otp);

if (!otp) throw new Error('OTP not found');

await page.bringToFront(); // make sure you're back to main page

const inputs = page.locator('input[name="otp"]');

for (let i = 0; i < otp.length; i++) {
  await inputs.nth(i).fill(otp[i]);
}

//await page.getByRole('button', { name: 'تحقق' }).click();

await page.waitForTimeout(10000);

});