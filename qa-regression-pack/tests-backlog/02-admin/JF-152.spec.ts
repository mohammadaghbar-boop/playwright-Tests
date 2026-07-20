import { test, expect } from '@playwright/test';

/**
 * JF-152 — Activate/Deactivate tasks تفعيل/تعطيل المهام
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-152-*.md
 */
test.describe('JF-152 Activate/Deactivate tasks تفعيل/تعطيل المهام', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-152 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-152/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-152' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-152 — API: endpoint contract & rules', async () => {
    // TODO(JF-152/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-152' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-152 — DB: persisted state matches', async () => {
    // TODO(JF-152/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-152' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
