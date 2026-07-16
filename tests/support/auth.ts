// Shared authentication flow — used by every feature spec.
// Relies on playwright.config `use.baseURL` pointing at the portal.
import type { Page } from '@playwright/test';

export interface Credentials {
  email: string;
  password: string;
}

export const DEFAULT_USER: Credentials = { email: 'demo-liquidator@azm.sa', password: 'Azm@123' };
export const JUDGE_USER: Credentials = { email: 'demo-judge@azm.sa', password: 'Azm@123' };

/** Log in to the portal and wait for the dashboard redirect. */
export async function login(page: Page, credentials: Credentials = DEFAULT_USER): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(credentials.password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}
