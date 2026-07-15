// Shared authentication flow — used by every feature spec.
// Relies on playwright.config `use.baseURL` pointing at the portal.

const DEFAULT_USER   = { email: 'demo-liquidator@azm.sa', password: 'Azm@123' };
const JUDGE_USER     = { email: 'demo-judge@azm.sa',      password: 'Azm@123' };

/** Log in to the portal and wait for the dashboard redirect. */
async function login(page, credentials = DEFAULT_USER) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'البريد الإلكتروني' }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'كلمة المرور' }).fill(credentials.password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
}

module.exports = { login, DEFAULT_USER, JUDGE_USER };
