import { test, expect } from '@playwright/test';

/**
 * JF-129 — إنشاء حساب مستخدم داخلي /Internal User
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-129-*.md
 */
test.describe('JF-129 إنشاء حساب مستخدم داخلي /Internal User', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-129 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-129/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-129' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-129 — API: endpoint contract & rules', async () => {
    // TODO(JF-129/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-129' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-129 — DB: persisted state matches', async () => {
    // TODO(JF-129/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-129' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-750 [To Do] Internal users can be created without a National ID, blocking login since National ID is required for authenti
  test.fixme('regression guard for JF-750 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-750' });
  });
});
