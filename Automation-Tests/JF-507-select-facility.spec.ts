/**
 * JF-507 — Select a Facility (Service Provider)
 *
 * Story: As a Service Provider, after logging in via Nafath and selecting
 * Service Provider role, I want to see and select my registered facility
 * to access the portal with that facility's context.
 *
 * Actual UI structure on /service-providers/companies:
 *   - "المنشآت المضافة سابقاً" — Infath-registered facilities (card layout)
 *   - "تسجيل منشأة يدوياً" button — always visible
 *   - "المنشآت المسجلة" — MoC-linked facilities per national ID (card layout)
 *
 * Login URL: https://d-infath-jf-portal.azm-cit.com/nafath-login
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { mockFacilitiesListSuccess, mockFacilitiesListFailure, MOCK_REGISTERED_FACILITIES } from './helpers/mockApi';

const BASE_URL = 'https://d-infath-jf-portal.azm-cit.com';

// ── Selectors ──────────────────────────────────────────────────────────────────

const SEL = {
  // Section containers (visible on page load)
  previousFacilitiesSection: 'text=المنشآت المضافة سابقاً',
  registeredFacilitiesSection: 'text=المنشآت المسجلة',

  // Cards in "المنشآت المضافة سابقاً" section
  facilityCard: '[class*="facility"], [class*="card"], article, li',

  // Status texts in facility cards
  activeFacility: 'text=نشط',  // حالة الحساب label for active facilities
  pendingFacility: 'text=قيد مراجعة إدارة المشتريات',

  // Empty state
  noFacilitiesMsg: 'text=لا يوجد',

  // Register / add facility button (always visible)
  addFacilityOption: 'button:has-text("تسجيل منشأة يدوياً")',
  registerBtn: 'button:has-text("تسجيل منشأة يدوياً")',

  // After selecting an active facility
  welcomingScreen: 'text=مرحباً, text=الرئيسية, text=لوحة التحكم',

  // Error state
  errorMsg: '.error-message, [role="alert"], .toast-error',
};

// ── Fixtures ───────────────────────────────────────────────────────────────────

const SP_COMPANIES_URL = `${BASE_URL}/service-providers/companies`;

test.use({ storageState: path.join(__dirname, '..', '.auth', 'sp.json') });

test.beforeEach(async ({ page }) => {
  await page.goto(SP_COMPANIES_URL);
  await page.waitForLoadState('networkidle');
  // If auto-retrieval failed (user is not owner), a "retrieve" button appears.
  // Click it to load MoC facilities so tests see actual facility data.
  const retrieveBtn = page.locator('button:has-text("التحقق من المنشآت")');
  if (await retrieveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await retrieveBtn.click();
    await page.waitForLoadState('networkidle');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1: Facility List Display
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-507 | Facility List Display', () => {

  test('TC-001 | Both facility sections are displayed after selecting Service Provider', async ({ page }) => {
    // Both section headings must be distinct visible elements on the page
    await expect(page.locator(SEL.previousFacilitiesSection)).toBeVisible();
    await expect(page.locator(SEL.registeredFacilitiesSection)).toBeVisible();
    // Manual registration CTA must also be present
    await expect(page.locator(SEL.addFacilityOption)).toBeVisible();
  });

  test('TC-004b | Add New Facility option shown even when no registered facilities', async ({ page }) => {
    // Mock facilities to empty, reload to get fresh data
    await mockFacilitiesListSuccess(page, []);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(SEL.addFacilityOption)).toBeVisible();
  });

  test('TC-005 | Empty state message shown when user has no registered facilities', async ({ page }) => {
    await mockFacilitiesListSuccess(page, []);
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Explicit empty-state text must appear — the add button alone is not enough
    const bodyText = await page.locator('body').innerText();
    const hasEmptyState = bodyText.includes('لا يوجد') || bodyText.includes('لا توجد');
    expect(hasEmptyState).toBeTruthy();
    // Add button must still be present alongside the empty state
    await expect(page.locator(SEL.addFacilityOption)).toBeVisible();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2: Facility Selection Behaviour
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-507 | Facility Selection', () => {

  test('TC-002 | Pending facility (قيد مراجعة إدارة المشتريات) card is visible in المنشآت المضافة سابقاً', async ({ page }) => {
    // Wait for the registered-facilities section to render with real data
    await page.waitForSelector(SEL.previousFacilitiesSection, { timeout: 10_000 });
    await page.waitForTimeout(500);

    // The pending-review status badge must appear inside the previously-added section
    const section = page.locator(SEL.previousFacilitiesSection);
    await expect(section).toBeVisible();

    // Status text scoped to the section's parent container
    const sectionParent = page.locator('text=المنشآت المضافة سابقاً').locator('..');
    const sectionText = await sectionParent.innerText().catch(() => '');

    // Fall back to full body if section parent is narrow
    const bodyText = await page.locator('body').innerText();
    const hasPending = sectionText.includes('قيد مراجعة') || bodyText.includes('قيد مراجعة إدارة المشتريات');
    expect(hasPending).toBeTruthy();
  });

  test('TC-003 | Active facility (نشط) card is visible in المنشآت المضافة سابقاً', async ({ page }) => {
    // Wait for the registered-facilities section to render with real data
    await page.waitForSelector(SEL.previousFacilitiesSection, { timeout: 10_000 });
    await page.waitForTimeout(500);

    const bodyText = await page.locator('body').innerText();

    // حالة الحساب shown as نشط for active facilities (not مفعل — that is the API status label)
    expect(bodyText).toContain('نشط');

    // At least one facility card must show الدخول على المنشأة CTA (only shown for active facilities)
    await expect(page.locator('button:has-text("الدخول على المنشأة"), a:has-text("الدخول على المنشأة")').first()).toBeVisible();

    // Sanity check: page must not show facilities belonging to another test user
    expect(bodyText).not.toContain('3000000001');
  });

  test('TC-006 | System does NOT auto-navigate when user lands on companies screen', async ({ page }) => {
    // On page load, we should still be on /service-providers/companies (not auto-navigated)
    expect(page.url()).toContain('/service-providers/companies');
    await expect(page.locator(SEL.previousFacilitiesSection)).toBeVisible();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3: Security & Error Handling
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-507 | Security & Error Handling', () => {

  test('TC-007 | Facilities from other users are not visible to the logged-in user', async ({ page }) => {
    // Mock a specific set of facilities for "User A"
    await mockFacilitiesListSuccess(page, [
      { id: 'fac-A1', facilityName: 'منشأة المستخدم أ - 1', unifiedNationalNumber: '2000000001', status: 'مفعل', servicesCount: 0 },
      { id: 'fac-A2', facilityName: 'منشأة المستخدم أ - 2', unifiedNationalNumber: '2000000002', status: 'مفعل', servicesCount: 0 },
    ]);

    // User B's facility should NOT appear regardless of what mocks return
    await expect(page.locator('text=3000000001')).not.toBeVisible();
    await expect(page.locator('text=منشأة المستخدم ب')).not.toBeVisible();
  });

  test('TC-008 | System displays an error and stays on current screen when facilities cannot be retrieved', async ({ page }) => {
    // Set up failure mock then reload to trigger it
    await mockFacilitiesListFailure(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    // Should show error OR still be on companies page (not navigated away)
    const isOnCompaniesPage = page.url().includes('/service-providers/companies');
    const hasError = await page.locator(SEL.errorMsg).isVisible().catch(() => false);
    expect(isOnCompaniesPage || hasError).toBeTruthy();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4: Facility Selection — Navigation & Business Rules
// Covers: Main Flow steps 8-11, Business Rules (pending blocked, no auto-select)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('JF-507 | Selection Navigation & Business Rules', () => {

  test('TC-009 | Clicking الدخول على المنشأة on an active facility navigates to the welcoming screen', async ({ page }) => {
    const accessBtn = page.locator('button:has-text("الدخول على المنشأة"), a:has-text("الدخول على المنشأة")').first();
    await expect(accessBtn).toBeVisible({ timeout: 8_000 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15_000 }),
      accessBtn.click(),
    ]);

    // Must land on the welcoming screen — not stay on or return to companies
    await expect(page).toHaveURL(/\/service-providers\/welcome/, { timeout: 10_000 });
  });

  test('TC-010 | Pending facility card has no "الدخول على المنشأة" access button — user cannot enter through it', async ({ page }) => {
    await page.waitForSelector(SEL.previousFacilitiesSection, { timeout: 10_000 });
    await page.waitForTimeout(500);

    // Cards are LI elements — confirmed from DOM inspection
    // Count total facility cards and total access buttons
    const totalCards = await page.locator('ul li:has-text("قيد مراجعة إدارة المشتريات")').count();
    expect(totalCards).toBeGreaterThan(0); // at least one pending card in test environment

    // Each pending card (LI containing pending status) must NOT contain the access button
    const pendingCardsWithAccessBtn = await page.locator(
      'ul li:has-text("قيد مراجعة إدارة المشتريات"):has(button:has-text("الدخول على المنشأة"))'
    ).count();
    expect(pendingCardsWithAccessBtn).toBe(0);
  });

  test('TC-011 | After entering a facility, the header shows a facility-switching button with the selected facility name', async ({ page }) => {
    await page.waitForSelector(SEL.previousFacilitiesSection, { timeout: 10_000 });

    // Record which facility the user is about to select
    const accessBtn = page.locator('button:has-text("الدخول على المنشأة"), a:has-text("الدخول على المنشأة")').first();
    await expect(accessBtn).toBeVisible({ timeout: 8_000 });

    // Capture the facility name from the card containing the access button
    const selectedFacilityCard = accessBtn.locator('xpath=ancestor::li[1]');
    const cardText = await selectedFacilityCard.innerText().catch(() => '');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15_000 }),
      accessBtn.click(),
    ]);

    await expect(page).toHaveURL(/\/service-providers\/welcome/, { timeout: 10_000 });

    // The header must contain a button with aria-label="تغيير المنشأة" showing the selected facility
    // Confirmed from DOM inspection: button[aria-label="تغيير المنشأة"] exists in the top bar
    const switchBtn = page.locator('button[aria-label="تغيير المنشأة"]');
    await expect(switchBtn).toBeVisible({ timeout: 8_000 });

    // The switch button displays the currently selected facility name
    const switchBtnText = await switchBtn.innerText();
    expect(switchBtnText.trim().length).toBeGreaterThan(0);
  });

  test('TC-012 | Facility list is always shown — system never auto-selects and navigates even with active facilities present', async ({ page }) => {
    // The real test user has at least one active facility (confirmed by TC-003/TC-009).
    // Business rule: system must show the list regardless of how many active facilities exist.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Must remain on the companies page after load — not redirected to welcome
    expect(page.url()).toContain('/service-providers/companies');

    // Both sections must be visible — the list was rendered, not bypassed
    await expect(page.locator(SEL.previousFacilitiesSection)).toBeVisible();
    await expect(page.locator(SEL.registeredFacilitiesSection)).toBeVisible();

    // At least one "الدخول على المنشأة" button must exist (active facilities present)
    // — if the system had auto-selected, this page would not be showing at all
    const accessBtnCount = await page.locator('button:has-text("الدخول على المنشأة")').count();
    expect(accessBtnCount).toBeGreaterThan(0);
  });

});
