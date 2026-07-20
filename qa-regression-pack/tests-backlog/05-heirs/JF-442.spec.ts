import { test, expect } from '@playwright/test';

/**
 * JF-442 — Display Heir Status Badge in Heirs List
 * Jira status at generation: To Do (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-442-*.md
 */
test.describe('JF-442 Display Heir Status Badge in Heirs List', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-442 — API: endpoint contract & rules', async () => {
    // TODO(JF-442/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-442' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-442 — DB: persisted state matches', async () => {
    // TODO(JF-442/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-442' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
