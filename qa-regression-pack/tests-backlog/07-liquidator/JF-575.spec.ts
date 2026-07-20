import { test, expect } from '@playwright/test';

/**
 * JF-575 — اضافة جهات الاستعلام
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-575-*.md
 */
test.describe('JF-575 اضافة جهات الاستعلام', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-575 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-575/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-575' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-575 — API: endpoint contract & rules', async () => {
    // TODO(JF-575/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-575' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-575 — DB: persisted state matches', async () => {
    // TODO(JF-575/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-575' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-988 [Ready For UAT] Blocker: "Add Inquiry Authority" and "view authority" navigate to a dead absolute /court-cases route, bouncing
  test.fixme('regression guard for JF-988 (verify fix)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-988' });
  });

  // JF-1059 [To Do] Create endpoints return 200 OK instead of 201 Created (app-wide Result<T> convention)
  test.fixme('regression guard for JF-1059 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1059' });
  });

  // JF-1060 [To Do] Inquiry Authorities tab shows a generic "failed to load / retry" error for non-Liquidator roles (403 not handl
  test.fixme('regression guard for JF-1060 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1060' });
  });

  // JF-1061 [To Do] Input-validation failures return generic BAD_REQUEST instead of the defined INQUIRY_AUTHORITY_* error codes (d
  test.fixme('regression guard for JF-1061 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1061' });
  });
});
