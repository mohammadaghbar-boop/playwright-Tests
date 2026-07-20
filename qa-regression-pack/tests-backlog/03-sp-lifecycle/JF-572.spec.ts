import { test, expect } from '@playwright/test';

/**
 * JF-572 — Manual Facility Registration
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-572-*.md
 */
test.describe('JF-572 Manual Facility Registration', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-572 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-572/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-572' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-572 — API: endpoint contract & rules', async () => {
    // TODO(JF-572/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-572' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-572 — DB: persisted state matches', async () => {
    // TODO(JF-572/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-572' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-748 [To Do] FACILITY_ALREADY_REGISTERED error is not displayed on the UI during manual facility registration
  test.fixme('regression guard for JF-748 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-748' });
  });

  // JF-749 [To Do] Wrong error message displayed when facility is not found during manual verification — shows connection error i
  test.fixme('regression guard for JF-749 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-749' });
  });

  // JF-857 [To Do] No input validation on facility unified national number field — system should enforce 10 digits starting with 
  test.fixme('regression guard for JF-857 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-857' });
  });

  // JF-862 [To Do] Design inconsistencies in Manual Facility Registration — data integrity concerns (JF-572 vs JF-493)
  test.fixme('regression guard for JF-862 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-862' });
  });
});
