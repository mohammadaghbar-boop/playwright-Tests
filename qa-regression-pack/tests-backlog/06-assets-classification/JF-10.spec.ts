import { test, expect } from '@playwright/test';

/**
 * JF-10 — تبويب بيانات الأصول
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-10-*.md
 */
test.describe('JF-10 تبويب بيانات الأصول', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-10 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-10/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-10' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-10 — API: endpoint contract & rules', async () => {
    // TODO(JF-10/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-10' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-10 — DB: persisted state matches', async () => {
    // TODO(JF-10/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-10' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-295 [QA] بيانات mock المركبة تفتقر إلى حقول مطلوبة في قسمي بيانات التسجيل والبيانات الأساسية
  test.fixme('regression guard for JF-295 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-295' });
  });

  // JF-296 [Ready for QA] البطاقة الرئيسية للأصل تفتقر إلى 3 حقول مطلوبة (رقم التركة - مالك الأصل المسجل - حالة الحجز)
  test.fixme('regression guard for JF-296 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-296' });
  });

  // JF-303 [To Do] الحقول التي فشل استرجاعها لا تُعلَّم بمؤشر مناسب في صفحة تفاصيل الأصل
  test.fixme('regression guard for JF-303 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-303' });
  });

  // JF-304 [Rejected]  لا يوجد له أساس في يحتاج مراجعة مع
  test.fixme('regression guard for JF-304 (verify fix)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-304' });
  });

  // JF-305 [Blocked] قسما بيانات الصك وبيانات العقار مفقودان كلياً من صفحة تفاصيل الأصل العقاري
  test.fixme('regression guard for JF-305 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-305' });
  });
});
