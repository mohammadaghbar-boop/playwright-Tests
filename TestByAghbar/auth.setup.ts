import { test as setup } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

setup('authenticate and select facility', async ({ page }) => {
  await page.goto(`${BASE_URL}/nafath-login`);
  await page.getByTestId('portal-card-service-providers').click();
  await page.getByRole('link', { name: 'Nafath' }).click();
  await page.getByRole('button', { name: 'Mock Users' }).click();
  await page.getByRole('button', { name: 'اختيار' }).first().click();
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  await page.waitForURL('**/service-providers/**', { timeout: 60000 });
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'الدخول على المنشأة' }).first().click();
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: AUTH_FILE });
});
