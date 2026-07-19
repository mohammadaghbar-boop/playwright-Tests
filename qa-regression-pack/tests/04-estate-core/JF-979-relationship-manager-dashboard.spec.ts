import { test, expect, Page, BrowserContext } from '@playwright/test';
import { loginInternal } from '../../src/helpers/login';
import { INTERNAL_USERS, URLS } from '../../src/helpers/users';

/**
 * JF-979 — لوحة المعلومات – مدير العلاقة (Relationship Manager dashboard). Backlog, Sprint-13.
 *
 * Live probe (2026-07-19, CIT): logging in as the RM demo account and opening /dashboard
 * renders the CURRENT generic internal dashboard (widgets عدد التركات المغلقة/المفتوحة,
 * المهام القادمة, الإنذارات والتنبيهات, أحدث التركات — with static seed rows INH03xx).
 * The JF-979 RM-specific layout (4 KPI cards, SLA cards, inquiries chart, latest-incoming-
 * inquiries table) is NOT built yet → those scenarios are `fixme` skeletons.
 *
 * Guarded live today:
 *   - RM login reaches /dashboard and the dashboard shell renders (notifications section);
 *   - the الكل / عرض target page التواصل والاستفسارات (/tickets) exists with the
 *     الاستفسارات الواردة tab and the inquiries table.
 *
 * NOTE: this project's storageState is EstateManager, so RM scenarios log in inside the
 * spec via the shared loginInternal helper (fresh context — email/password, no Nafath).
 */

function annotateStory(): void {
  test.info().annotations.push({ type: 'story', description: 'JF-979' });
}

test.describe('JF-979 Relationship Manager dashboard', () => {
  let rmContext: BrowserContext;
  let rmPage: Page;

  test.beforeAll(async ({ browser }) => {
    // storageState: undefined is REQUIRED — browser.newContext() inherits the
    // project's use-options, so without it this context would reuse the
    // EstateManager session and /login would bounce straight to /dashboard.
    rmContext = await browser.newContext({ locale: 'ar-SA', storageState: undefined });
    rmPage = await rmContext.newPage();
    await loginInternal(rmPage, INTERNAL_USERS.relationshipManager.email, INTERNAL_USERS.relationshipManager.password);
  });

  test.afterAll(async () => {
    await rmContext?.close();
  });

  test('@blocker RM login lands on the dashboard and the dashboard shell renders', async () => {
    annotateStory();
    // loginInternal already waited for the post-login redirect away from /login.
    await expect(rmPage).toHaveURL(/\/dashboard/);
    // Dashboard shell as it exists today: notifications section + latest-estates section.
    await expect(rmPage.getByRole('heading', { name: 'الإنذارات والتنبيهات' })).toBeVisible();
    await expect(rmPage.getByText('أحدث التركات').first()).toBeVisible();
    // Side-menu entry for the dashboard itself.
    await expect(rmPage.getByRole('link', { name: 'لوحة المعلومات' })).toBeVisible();
  });

  test('@high the الكل target page (التواصل والاستفسارات) exposes the incoming-inquiries view', async () => {
    annotateStory();
    // BR-006: "الكل" must navigate to the Communication & Inquiries (incoming) page —
    // guard that the target page already exists for an RM session and shows the
    // incoming tab plus the inquiry-table columns the dashboard table will mirror.
    await rmPage.goto(`${URLS.portal}/tickets`);
    await expect(rmPage.getByRole('heading', { name: 'التواصل والاستفسارات' }).first()).toBeVisible();
    await expect(rmPage.getByText('الاستفسارات الواردة').first()).toBeVisible();
    await expect(rmPage.getByRole('columnheader', { name: 'رقم الاستفسار' })).toBeVisible();
    await expect(rmPage.getByRole('columnheader', { name: 'الحالة' })).toBeVisible();
  });

  test.fixme('@high KPI cards render the four RM counters scoped to the logged-in RM', async () => {
    annotateStory();
    // Arrange: RM session (rmPage) on /dashboard.
    // Act: locate the KPI-cards row.
    // Assert — the four cards defined by the story, each with a numeric value:
    //   "الاستفسارات الواردة"             — incoming inquiries assigned to this RM, status بانتظار الرد or قيد التنفيذ
    //   "مخاطبات تحتاج متابعة من المصفي"  — liquidator correspondences requiring follow-up, not Completed
    //   "مخاطبات مصعدة من المصفي"         — correspondences escalated by the liquidator
    //   "مراجعات قانونية من المصفي"       — liquidator legal-review requests, not Completed
    // Cross-check: الاستفسارات الواردة count should match the counter on /tickets
    // (tab "الاستفسارات الواردة N"). No dashboard API is in ENDPOINTS yet — add it once built.
    // BR-001: values must reflect only records assigned to the logged-in RM.
  });

  test.fixme('@medium notifications & alerts list is ordered newest-first (BR-003)', async () => {
    annotateStory();
    // Arrange: RM session on /dashboard, section "الإنذارات والتنبيهات" (exists today with static data).
    // Act: read the notification rows' timestamps.
    // Assert: strictly descending by creation date/time; latest RM/liquidator updates shown.
    // BR-002: reloading the page refreshes the list to the latest data.
  });

  test.fixme('@medium SLA cards render below the notifications section', async () => {
    annotateStory();
    // Arrange: RM session on /dashboard.
    // Assert — two SLA cards, positioned BELOW الإنذارات والتنبيهات:
    //   "أصول تجاوزت المدة الزمنية المحددة"        — liquidator assets past the configured SLA
    //   "أصول أوشكت على تجاوز المدة الزمنية المحددة" — liquidator assets approaching the SLA threshold
    // Note: the current generic dashboard shows similarly-named counters inside a
    // "تتبّع حالة الأصول" widget — JF-979 requires them as dedicated SLA cards for the RM.
  });

  test.fixme('@medium chart الاستفسارات المنجزة مقابل الغير منجزة renders with real-time RM data', async () => {
    annotateStory();
    // Arrange: RM session on /dashboard.
    // Assert: a chart titled "الاستفسارات المنجزة مقابل الغير منجزة" showing the
    // completed vs pending distribution of the RM's inquiries (BR-004: real-time,
    // scoped to the logged-in RM's assigned records).
  });

  test.fixme('@high latest-incoming-inquiries table shows the defined columns and at most 5 rows (BR-007)', async () => {
    annotateStory();
    // Arrange: RM session on /dashboard, table "أحدث الاستفسارات الواردة".
    // Assert columns: رقم الاستفسار | الموضوع | المرسل | النوع | الحالة | تاريخ الارسال | الإجراءات (عرض)
    //   plus the "الكل" button.
    // Assert: no more than five (5) data rows are rendered (BR-007).
    // Note: /tickets today lists الجهة المستلمة for outgoing — the dashboard table is the
    // incoming variant with المرسل (sender).
  });

  test.fixme('@high عرض on an incoming-inquiry row navigates to the inquiry details page (BR-005)', async () => {
    annotateStory();
    // Arrange: RM session on /dashboard with at least one incoming inquiry row.
    // Act: click الإجراءات → عرض on the first row.
    // Assert: navigation to the corresponding inquiry details page (today inquiry detail
    // lives under /tickets — capture the exact route once the dashboard link exists)
    // and the inquiry number on the details page matches the clicked row.
  });

  test.fixme('@high الكل navigates to the Communication & Inquiries (incoming) page (BR-006)', async () => {
    annotateStory();
    // Arrange: RM session on /dashboard.
    // Act: click the "الكل" button of the latest-incoming-inquiries table.
    // Assert: navigation to التواصل والاستفسارات (/tickets) with the incoming
    // (الاستفسارات الواردة) view active, showing the full list.
  });

  test.fixme('@high dashboard data is scoped to the logged-in RM only (BR-001)', async () => {
    annotateStory();
    // Arrange: two internal sessions — the RM demo account and a second account
    // (e.g. INTERNAL_USERS.estateManager) with different assignments.
    // Act: read KPI values / table rows for each session.
    // Assert: the RM dashboard reflects only records assigned to that RM (counts and
    // rows differ from the other role's view; no foreign assignments leak).
  });
});
