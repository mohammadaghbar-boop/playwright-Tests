import { test, expect } from '@playwright/test';

/**
 * JF-674 — Create Case Virtual Account Integration ( Heirs)
 * Jira status at generation: Backlog (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-674-*.md
 */
test.describe('JF-674 Create Case Virtual Account Integration ( Heirs)', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-674 — API: endpoint contract & rules', async () => {
    // TODO(JF-674/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-674' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-674 — DB: persisted state matches', async () => {
    // TODO(JF-674/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-674' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
