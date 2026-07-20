import { test, expect } from '@playwright/test';

/**
 * JF-715 — Synchronize Inheritance Financial Journals from ERP
 * Jira status at generation: Backlog (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-715-*.md
 */
test.describe('JF-715 Synchronize Inheritance Financial Journals from ERP', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-715 — API: endpoint contract & rules', async () => {
    // TODO(JF-715/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-715' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-715 — DB: persisted state matches', async () => {
    // TODO(JF-715/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-715' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
