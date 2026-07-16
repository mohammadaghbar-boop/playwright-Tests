// Feature: Authentication
import { test, expect } from '@playwright/test';
import { login } from '../../support/auth';

test.describe('Auth — portal login', () => {
  test('JF-AUTH — Login as Liquidator lands on dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard/);
  });
});
