import { test, expect } from '@playwright/test';

/**
 * JF-678 — Create Case Virtual Account for Inheritance
 * Jira status at generation: To Do (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-678-*.md
 */
test.describe('JF-678 Create Case Virtual Account for Inheritance', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-678 — API: endpoint contract & rules', async () => {
    // TODO(JF-678/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-678' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-678 — DB: persisted state matches', async () => {
    // TODO(JF-678/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-678' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
