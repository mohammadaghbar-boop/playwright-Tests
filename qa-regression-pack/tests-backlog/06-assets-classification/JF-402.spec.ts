import { test, expect } from '@playwright/test';

/**
 * JF-402 — إنشاء مهام للأصول غير الجاهزة أو المقيدة بحسب محضر معاينتها
 * Jira status at generation: Backlog (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-402-*.md
 */
test.describe('JF-402 إنشاء مهام للأصول غير الجاهزة أو المقيدة بحسب محضر معاينتها', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-402 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-402/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-402' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-402 — API: endpoint contract & rules', async () => {
    // TODO(JF-402/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-402' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-402 — DB: persisted state matches', async () => {
    // TODO(JF-402/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-402' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
