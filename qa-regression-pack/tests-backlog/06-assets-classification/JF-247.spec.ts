import { test, expect } from '@playwright/test';

/**
 * JF-247 — التقييم المؤتمت للعقارات
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-247-*.md
 */
test.describe('JF-247 التقييم المؤتمت للعقارات', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-247 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-247/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-247' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-247 — API: endpoint contract & rules', async () => {
    // TODO(JF-247/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-247' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-247 — DB: persisted state matches', async () => {
    // TODO(JF-247/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-247' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-664 [Rejected] Valuation record does not store plan_number and parcel_number
  test.fixme('regression guard for JF-664 (verify fix)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-664' });
  });

  // JF-671 [To Do] System sends only one AVM request for land property type instead of two separate requests
  test.fixme('regression guard for JF-671 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-671' });
  });
});
