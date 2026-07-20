import { test, expect } from '@playwright/test';

/**
 * JF-291 — الاستعلام عن الموجودات الاستثمارية من هيئة سوق المال
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-291-*.md
 */
test.describe('JF-291 الاستعلام عن الموجودات الاستثمارية من هيئة سوق المال', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-291 — API: endpoint contract & rules', async () => {
    // TODO(JF-291/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-291' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-291 — DB: persisted state matches', async () => {
    // TODO(JF-291/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-291' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-660 [To Do] System accepts duplicate MsgId values across multiple CMA inquiry requests
  test.fixme('regression guard for JF-660 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-660' });
  });
});
