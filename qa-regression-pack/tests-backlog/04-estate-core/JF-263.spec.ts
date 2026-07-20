import { test, expect } from '@playwright/test';

/**
 * JF-263 — Unique "technicalReferenceId" - System accepts duplicate technicalReferenceId without rejection - Confirmation required
 * Jira status at generation: To Do (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-263-*.md
 */
test.describe('JF-263 Unique "technicalReferenceId" - System accepts duplicate technicalReferenceId without rejection - Confirmation required', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-263 — API: endpoint contract & rules', async () => {
    // TODO(JF-263/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-263' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-263 — DB: persisted state matches', async () => {
    // TODO(JF-263/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-263' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
