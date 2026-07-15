// Feature: Authentication
const { test, expect } = require('@playwright/test');
const { login, JUDGE_USER } = require('../../support/auth');

test.describe('Auth — portal login', () => {
  test('JF-AUTH — Login as Liquidator lands on dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard/);
  });
});
