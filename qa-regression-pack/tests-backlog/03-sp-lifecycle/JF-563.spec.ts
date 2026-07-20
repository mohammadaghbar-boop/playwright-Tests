import { test, expect } from '@playwright/test';

/**
 * JF-563 — Services List / قائمة الخدمات
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-563-*.md
 */
test.describe('JF-563 Services List / قائمة الخدمات', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-563 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-563/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-563' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-563 — API: endpoint contract & rules', async () => {
    // TODO(JF-563/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-563' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-563 — DB: persisted state matches', async () => {
    // TODO(JF-563/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-563' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-878 [To Do] النوع الفرعي filter not disabled when نوع الخدمة is not exclusively مصفي
  test.fixme('regression guard for JF-878 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-878' });
  });

  // JF-880 [To Do] التصنيف (Classification) filter missing from Services List filter bar
  test.fixme('regression guard for JF-880 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-880' });
  });

  // JF-881 [To Do] حالة الخدمة displays "نشط" instead of "مفعل" as defined in story JF-563
  test.fixme('regression guard for JF-881 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-881' });
  });

  // JF-966 [To Do] Services List shows misleading "no services" empty state instead of a load-error message when facility-service
  test.fixme('regression guard for JF-966 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-966' });
  });
});
