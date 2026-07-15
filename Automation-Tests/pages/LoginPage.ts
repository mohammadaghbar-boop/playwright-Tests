import { BasePage } from './BasePage';

export interface Credentials {
  email: string;
  password: string;
}

/**
 * Canonical email/password login for the JF portal `/login` page.
 *
 * This replaces the login flow that is currently re-implemented inline across
 * several specs/helpers. Uses role-based locators and a relative URL (relies on
 * `use.baseURL` from Phase 2), and waits on the dashboard URL rather than a fixed sleep.
 */
export class LoginPage extends BasePage {
  private readonly emailBox = () => this.page.getByRole('textbox', { name: 'البريد الإلكتروني' });
  private readonly passwordBox = () => this.page.getByRole('textbox', { name: 'كلمة المرور' });
  private readonly submitBtn = () => this.page.getByRole('button', { name: 'تسجيل الدخول' });

  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  async login(creds: Credentials): Promise<void> {
    await this.goto();
    await this.emailBox().fill(creds.email);
    await this.passwordBox().fill(creds.password);
    await this.submitBtn().click();
    await this.page.waitForURL('**/dashboard');
  }
}
