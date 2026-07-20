import { test, expect } from '@playwright/test';

/**
 * JF-360 — Create External User
 * Jira status at generation: Backlog (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-360-*.md
 */
test.describe('JF-360 Create External User', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-360 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-360/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-360' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-360 — API: endpoint contract & rules', async () => {
    // TODO(JF-360/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-360' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-360 — DB: persisted state matches', async () => {
    // TODO(JF-360/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-360' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
