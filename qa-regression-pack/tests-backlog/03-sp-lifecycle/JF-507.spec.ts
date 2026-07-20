import { test, expect } from '@playwright/test';

/**
 * JF-507 — Select a Facility - Service Provider.
 * Jira status at generation: Ready For UAT (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-507-*.md
 */
test.describe('JF-507 Select a Facility - Service Provider.', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-507 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-507/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-507' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-507 — API: endpoint contract & rules', async () => {
    // TODO(JF-507/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-507' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-507 — DB: persisted state matches', async () => {
    // TODO(JF-507/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-507' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
