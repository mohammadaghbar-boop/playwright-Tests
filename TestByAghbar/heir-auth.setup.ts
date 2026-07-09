import { test as setup } from '@playwright/test';
import path from 'path';

export const HEIR_AUTH_FILE = path.join(__dirname, '.auth', 'heir.json');

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

setup('authenticate as heir', async ({ page }) => {
  await page.goto(`${BASE_URL}/nafath-login`);
  // Select the Heirs portal card (different from service-providers)
  await page.getByTestId('portal-card-heirs').click();
  await page.getByRole('link', { name: 'Nafath' }).click();
  await page.getByRole('button', { name: 'Mock Users' }).click();
  // Use the first available mock heir user
  await page.getByRole('button', { name: 'اختيار' }).first().click();
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  // Handle ERR_ABORTED during Keycloak multi-hop redirect chain
  try {
    await page.waitForURL('**/heirs/**', { timeout: 90000 });
  } catch {
    await page.waitForURL('**/heirs/**', { timeout: 30000 });
  }
  await page.waitForLoadState('networkidle');

  // Navigate to court-cases to hydrate heir session before saving state
  await page.goto(`${BASE_URL}/heirs/court-cases`);
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: HEIR_AUTH_FILE });
});
