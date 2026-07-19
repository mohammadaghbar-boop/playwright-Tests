import { test, expect } from '@playwright/test';
import { annotateKnownIssue } from '../../src/known-issues';

/**
 * JF-974 — لوحة المعلومات – الوارث (Heir dashboard). Backlog, Sprint-13.
 *
 * Live probe (2026-07-19, CIT, registered heir NID 1133154595 / heir storageState):
 * /heirs/dashboard loads and renders the shell heading "لوحة معلومات الورثة"
 * with the heir side menu
 * (لوحة المعلومات، التركات، الإفصاحات، التواصل والاستفسارات) and a healthy mainHub
 * WebSocket. None of the JF-974 sections (estate selector, progress/timeline,
 * inquiries summary, required actions, documents) are built yet, and the seeded heir
 * has 0 linked estates → those scenarios are `fixme` skeletons.
 *
 * Guarded live today:
 *   - the dashboard route is reachable for a registered heir (also guards JF-740/741
 *     staying fixed) and the shell renders;
 *   - the التواصل والاستفسارات target of the inquiries-summary "الكل" exists (/heirs/tickets).
 */

function annotateStory(): void {
  test.info().annotations.push({ type: 'story', description: 'JF-974' });
}

test.describe('JF-974 Heir dashboard', () => {
  test('@blocker registered heir lands on the dashboard and the shell renders', async ({ page }) => {
    annotateStory();
    // A failure here historically meant JF-740 (SignalR CORS — dashboard never loads);
    // it did not reproduce on 2026-07-16/19 but classify a regression as KNOWN.
    annotateKnownIssue(test, 'JF-740');
    await page.goto('/heirs/dashboard');
    // A broken/expired heir session bounces to /register, /login or nafath-login.
    await expect
      .poll(() => (/\/register|\/login(\b|$)|nafath-login/.test(page.url()) ? 'unauth' : 'portal'), { timeout: 20_000 })
      .toBe('portal');
    await expect(page).toHaveURL(/\/heirs\/dashboard/);
    await expect(page.getByText('لوحة معلومات الورثة').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'لوحة المعلومات' })).toBeVisible();
  });

  test('@high the inquiries-summary الكل target page exists in the heir portal', async ({ page }) => {
    annotateStory();
    // The inquiries-summary card's "الكل" must navigate to التواصل والاستفسارات —
    // guard that the heir-portal target route already exists in the side menu.
    await page.goto('/heirs/dashboard');
    const ticketsLink = page.getByRole('link', { name: 'التواصل والاستفسارات' });
    await expect(ticketsLink).toBeVisible();
    await expect(ticketsLink).toHaveAttribute('href', '/heirs/tickets');
  });

  test.fixme('@high estate selector lists linked estates and switching refreshes all sections (BR-002)', async ({ page }) => {
    annotateStory();
    // Precondition: a registered heir linked to MORE THAN ONE estate (none exists on CIT —
    // seed an estate whose heirs include NID 1133154595; see area-d coverage gap #2).
    // Arrange: goto /heirs/dashboard.
    // Act: open the estate dropdown; assert it lists only estates linked to the heir (BR-001);
    //      select the second estate.
    // Assert: every dashboard section (progress, updates, inquiries summary, required
    //         actions, documents) refreshes to the newly selected estate's data.
    // With exactly one estate the selector shall not be displayed.
  });

  test.fixme('@blocker estate progress section shows percentage, 7-stage timeline and responsible liquidator', async ({ page }) => {
    annotateStory();
    // Arrange: heir with ≥1 linked estate on /heirs/dashboard.
    // Assert — Estate Progress section renders:
    //   - overall completion percentage of the selected estate;
    //   - timeline with the stages, current + completed marked:
    //     فتح التركة، التحقق من الورثة، الحصر، تقييم الأصول، سداد الديون، التوزيع، الإغلاق;
    //   - the assigned responsible liquidator (المصفي) name.
  });

  test.fixme('@medium completion percentage matches the per-stage mapping (BR-003)', async ({ page }) => {
    annotateStory();
    // Assert the percentage equals the mapping for the estate's last COMPLETED stage:
    //   فتح التركة 10% | التحقق من الورثة 20% | الحصر 40% | تقييم الأصول 60% |
    //   سداد الديون 80% | التوزيع 90% | الإغلاق 100%
    // Cross-check the stage via the internal estate detail (سير العمل) or a status API
    // once exposed (GET /cases/api/v1/court-cases/{id} carries the case status).
  });

  test.fixme('@medium latest estate updates are ordered newest-first (BR-004)', async ({ page }) => {
    annotateStory();
    // Arrange: heir estate with ≥2 updates.
    // Assert: "آخر التحديثات" items are sorted strictly descending by update date/time
    //         and relate only to the selected estate.
    // BR-006: reloading the page refreshes the list to the latest data.
  });

  test.fixme('@high inquiries summary cards count the estate outgoing inquiries and الكل navigates to التواصل والاستفسارات', async ({ page }) => {
    annotateStory();
    // Assert — five cards, each counting the selected estate's OUTGOING inquiries:
    //   اجمالي عدد الاستفسارات | قيد التنفيذ | بانتظار الرد | مغلقة | مكتملة
    // Act: click "الكل".
    // Assert: navigation to /heirs/tickets (التواصل والاستفسارات) — page exists today.
    // Cross-check counts against the tickets list filtered to the estate.
  });

  test.fixme('@high required actions show only the heir\'s pending actions (BR-005)', async ({ page }) => {
    annotateStory();
    // Arrange: heir with pending actions on the selected estate.
    // Assert: the Required Actions section lists only PENDING actions assigned to the
    //         logged-in heir, of the story's types: افصاح، اقرار، ايبان البنك.
    // Completed actions must not appear; each action should link to its completion flow
    // (e.g. افصاح → /heirs/disclosures/new — route exists today).
  });

  test.fixme('@medium dashboard shows only estates associated with the logged-in heir (BR-001)', async ({ page }) => {
    annotateStory();
    // Arrange: two registered heirs linked to different estates.
    // Assert: each heir's estate selector / dashboard data exposes only their own
    //         estates; a foreign estate id in the selector or deep-link must not load.
    // Today's observable: heir 1133154595 has 0 linked estates and /heirs/court-cases
    // is empty for them (guarded live in JF-1096).
  });
});
