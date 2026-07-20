import { test, expect } from '@playwright/test';

/**
 * JF-150 — Password Reset / إعادة تعريف كلمة السر
 * Jira status at generation: Backlog (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-150-*.md
 */
test.describe('JF-150 Password Reset / إعادة تعريف كلمة السر', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-150 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-150/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-150' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-150 — API: endpoint contract & rules', async () => {
    // TODO(JF-150/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-150' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-150 — DB: persisted state matches', async () => {
    // TODO(JF-150/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-150' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
