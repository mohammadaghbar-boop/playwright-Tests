import { test, expect } from '@playwright/test';

/**
 * JF-564 — Register a New Service
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-564-*.md
 */
test.describe('JF-564 Register a New Service', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-564 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-564/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-564' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-564 — API: endpoint contract & rules', async () => {
    // TODO(JF-564/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-564' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-564 — DB: persisted state matches', async () => {
    // TODO(JF-564/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-564' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-823 [To Do] Incorrect UI labels in تسجيل خدمة جديدة wizard — step names and button text
  test.fixme('regression guard for JF-823 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-823' });
  });

  // JF-825 [To Do] Step 2 بيانات عامة — Multiple UI issues on general data form
  test.fixme('regression guard for JF-825 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-825' });
  });

  // JF-826 [To Do] Step 3 السجل التجاري — Multiple issues: city dropdown resets on back navigation and address fields accept non-
  test.fixme('regression guard for JF-826 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-826' });
  });

  // JF-827 [To Do] Step 5 التراخيص — Coverage dropdowns reset on back navigation and رقم الرخصة accepts non-numeric input
  test.fixme('regression guard for JF-827 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-827' });
  });

  // JF-828 [To Do] Step 6 خبرات المنشأة — إضافة شهادة إنجاز pop-up is completely blocked due to empty نوع المصدر and broken date 
  test.fixme('regression guard for JF-828 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-828' });
  });

  // JF-829 [To Do] Step 1 and Step 6 — تعليمات and شروط والأحكام text not displayed due to 500 error on site-config API endpoints
  test.fixme('regression guard for JF-829 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-829' });
  });

  // JF-830 [To Do] URGENT — File upload blocked by CORS on /files/upload-chunked — service registration submission completely bro
  test.fixme('regression guard for JF-830 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-830' });
  });

  // JF-832 [To Do] File download fails with ERR_CONNECTION_TIMED_OUT — internal OSS URL used instead of public endpoint
  test.fixme('regression guard for JF-832 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-832' });
  });

  // JF-834 [To Do] Step 2  البريد الإلكتروني -- بيانات عامة accepts invalid email formats
  test.fixme('regression guard for JF-834 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-834' });
  });

  // JF-835 [To Do] File upload — accepts empty 0 KB files and spoofed extension files (fake MIME type)
  test.fixme('regression guard for JF-835 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-835' });
  });

  // JF-836 [To Do] Step 2 الضمان البنكي — مبلغ الضمان field has SyntaxError on paste, no max length, and accepts leading zeros
  test.fixme('regression guard for JF-836 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-836' });
  });

  // JF-837 [To Do] Step 4 الشهادات الرسمية — Multiple input validation issues: non-numeric input accepted, no max length, and Syn
  test.fixme('regression guard for JF-837 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-837' });
  });

  // JF-838 [To Do] Step 6 خبرات المنشأة — Multiple issues: no input validation on text fields, unlimited file uploads, and data l
  test.fixme('regression guard for JF-838 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-838' });
  });

  // JF-901 [To Do] Missing system-generated unique service reference number for created services
  test.fixme('regression guard for JF-901 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-901' });
  });

  // JF-902 [To Do] No duplicate-service guard: a facility can register unlimited Liquidator services, inflating assignment odds
  test.fixme('regression guard for JF-902 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-902' });
  });
});
