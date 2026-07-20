import { test, expect } from '@playwright/test';

/**
 * JF-493 — Register a facility
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-493-*.md
 */
test.describe('JF-493 Register a facility', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-493 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-493/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-493' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-493 — API: endpoint contract & rules', async () => {
    // TODO(JF-493/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-493' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-493 — DB: persisted state matches', async () => {
    // TODO(JF-493/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-493' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-849 [To Do] Undocumented intermediate facility selection page appears after clicking View — re-fetches facilities and is n
  test.fixme('regression guard for JF-849 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-849' });
  });

  // JF-850 [To Do] Inconsistent row alignment in "المنشآت المضافة سابقاً" section — status badges and action buttons not aligned 
  test.fixme('regression guard for JF-850 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-850' });
  });
});
