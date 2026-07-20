import { test, expect } from '@playwright/test';

/**
 * JF-571 — Refill / Modify Returned Service Registration Request
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-571-*.md
 */
test.describe('JF-571 Refill / Modify Returned Service Registration Request', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-571 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-571/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-571' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-571 — API: endpoint contract & rules', async () => {
    // TODO(JF-571/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-571' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-571 — DB: persisted state matches', async () => {
    // TODO(JF-571/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-571' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-963 [To Do] Service Details page — long text without spaces overflows container in "سبب الإعادة" and "تفاصيل الإفصاح" fiel
  test.fixme('regression guard for JF-963 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-963' });
  });
});
