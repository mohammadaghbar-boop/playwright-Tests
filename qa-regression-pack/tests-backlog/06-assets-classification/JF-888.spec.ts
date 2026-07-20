import { test, expect } from '@playwright/test';

/**
 * JF-888 — Add a case/ إضافة قضية
 * Jira status at generation: Ready for QA (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-888-*.md
 */
test.describe('JF-888 Add a case/ إضافة قضية', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-888 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-888/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-888' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-888 — API: endpoint contract & rules', async () => {
    // TODO(JF-888/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-888' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-888 — DB: persisted state matches', async () => {
    // TODO(JF-888/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-888' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-1020 [To Do] Systemic: court-case-detail child navigations use absolute /court-cases paths, bouncing SP-portal Liquidators 
  test.fixme('regression guard for JF-1020 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1020' });
  });
});
