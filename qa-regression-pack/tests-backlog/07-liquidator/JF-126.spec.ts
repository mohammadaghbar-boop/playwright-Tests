import { test, expect } from '@playwright/test';

/**
 * JF-126 — API استقبال طلب إسناد التركة من الجهات المحيلة عبر الربط التقني
 * Jira status at generation: Backlog (NOT developed yet)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-126-*.md
 */
test.describe('JF-126 API استقبال طلب إسناد التركة من الجهات المحيلة عبر الربط التقني', () => {
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-126 — API: endpoint contract & rules', async () => {
    // TODO(JF-126/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-126' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-126 — DB: persisted state matches', async () => {
    // TODO(JF-126/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-126' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });
});
