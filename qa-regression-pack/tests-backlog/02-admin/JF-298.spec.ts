import { test, expect } from '@playwright/test';

/**
 * JF-298 — QA Input: Define Global UI & Functional Standards Across the Portal
 * Jira status at generation: To Do (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-298-*.md
 */
test.describe('JF-298 QA Input: Define Global UI & Functional Standards Across the Portal', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-298 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-298/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-298' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-298 — API: endpoint contract & rules', async () => {
    // TODO(JF-298/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-298' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-298 — DB: persisted state matches', async () => {
    // TODO(JF-298/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-298' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
