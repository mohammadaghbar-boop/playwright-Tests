import { test, expect } from '@playwright/test';

/**
 * JF-18 — الفلاتر على صفحة قائمة المهام
 * Jira status at generation: Ready For UAT (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-18-*.md
 */
test.describe('JF-18 الفلاتر على صفحة قائمة المهام', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-18 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-18/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-18' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-18 — API: endpoint contract & rules', async () => {
    // TODO(JF-18/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-18' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-18 — DB: persisted state matches', async () => {
    // TODO(JF-18/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-18' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
