import { test, expect } from '@playwright/test';

/**
 * JF-714 — Accounting Journal List
 * Jira status at generation: Backlog (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-714-*.md
 */
test.describe('JF-714 Accounting Journal List', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-714 — API: endpoint contract & rules', async () => {
    // TODO(JF-714/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-714' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-714 — DB: persisted state matches', async () => {
    // TODO(JF-714/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-714' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
