import { test, expect } from '@playwright/test';

// Tests the Reject decision flow:
// heir-ack-button → modal → heir-ack-reject-btn → disclosure form view →
// heir-ack-reject-back (back to decision) → fill form → heir-ack-reject-submit → success

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';
const COURT_CASES_URL = `${BASE_URL}/heirs/court-cases`;

async function waitForPage(page: any, url: string) {
  try {
    await page.goto(url);
  } catch {
    await page.waitForTimeout(2000);
    await page.goto(url);
  }
  await page.waitForLoadState('networkidle');
}

async function navigateToActionableAsset(page: any): Promise<boolean> {
  await waitForPage(page, COURT_CASES_URL);
  await Promise.race([
    page.locator('table tbody tr').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
    page.locator('text=لا توجد').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {}),
  ]);
  if (!await page.locator('table tbody tr').first().isVisible()) return false;

  const caseLinks = await page.locator('table tbody tr a').all();
  for (const link of caseLinks) {
    await link.click();
    await page.waitForLoadState('networkidle');

    const assetLinks = await page.locator('table tbody tr a').all();
    for (const assetLink of assetLinks) {
      await assetLink.click();
      await page.waitForLoadState('networkidle');
      if (await page.getByTestId('heir-ack-button').isVisible()) return true;
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
    await waitForPage(page, COURT_CASES_URL);
  }
  return false;
}

async function openDecisionModal(page: any) {
  await page.getByTestId('heir-ack-button').click();
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });
}

test.describe('JF-167 — Reject Flow', () => {
  test('JF-TC-HA-19 - Clicking إنشاء إفصاح shows the disclosure form view', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found');

    await openDecisionModal(page);
    await page.getByTestId('heir-ack-reject-btn').click();

    // Reject view shows إنشاء إفصاح title and the disclosure form
    await expect(page.getByText('إنشاء إفصاح')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('heir-ack-reject-submit')).toBeVisible();
  });

  test('JF-TC-HA-20 - Back button on reject view returns to decision view', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found');

    await openDecisionModal(page);
    await page.getByTestId('heir-ack-reject-btn').click();
    await page.getByText('إنشاء إفصاح').waitFor({ state: 'visible', timeout: 10000 });

    await page.getByTestId('heir-ack-reject-back').click();

    // Should be back on decision view showing both Confirm and Reject buttons
    await expect(page.getByTestId('heir-ack-confirm-btn')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('heir-ack-reject-btn')).toBeVisible();
  });

  test('JF-TC-HA-21 - Disclosure form loads (app-form-preview renders within modal)', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found');

    await openDecisionModal(page);
    await page.getByTestId('heir-ack-reject-btn').click();
    await page.getByText('إنشاء إفصاح').waitFor({ state: 'visible', timeout: 10000 });

    // The disclosure form component should render inside the modal
    // It uses app-form-preview with fillable mode
    await expect(page.locator('app-form-preview')).toBeVisible({ timeout: 15000 });
  });

  test('JF-TC-HA-22 - Submit rejection shows success screen تم إرسال الإفصاح', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found');

    await openDecisionModal(page);
    await page.getByTestId('heir-ack-reject-btn').click();
    await page.getByText('إنشاء إفصاح').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('app-form-preview').waitFor({ state: 'visible', timeout: 15000 });

    // Fill mandatory form fields if any radio/segmented choices are present
    const choices = page.locator('app-form-preview [type="radio"], app-form-preview button[role="radio"]');
    const choiceCount = await choices.count();
    if (choiceCount > 0) {
      await choices.first().click();
    }

    await page.getByTestId('heir-ack-reject-submit').click();

    await expect(page.getByText('تم إرسال الإفصاح')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('تم تسجيل اعتراضكم وإرسال الإفصاح بنجاح')).toBeVisible();
  });

  test('JF-TC-HA-23 - After rejection, asset shows تم تقديم إفصاح status badge', async ({ page }) => {
    const found = await navigateToActionableAsset(page);
    test.skip(!found, 'No actionable asset found');

    await openDecisionModal(page);
    await page.getByTestId('heir-ack-reject-btn').click();
    await page.getByText('إنشاء إفصاح').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('app-form-preview').waitFor({ state: 'visible', timeout: 15000 });

    const choices = page.locator('app-form-preview [type="radio"], app-form-preview button[role="radio"]');
    if (await choices.count() > 0) await choices.first().click();

    await page.getByTestId('heir-ack-reject-submit').click();
    await page.getByText('تم إرسال الإفصاح').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('heir-ack-close').click();

    await expect(page.getByTestId('heir-ack-status-rejected')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('heir-ack-status-rejected')).toContainText('تم تقديم إفصاح');
    await expect(page.getByTestId('heir-ack-button')).not.toBeVisible();
  });
});
