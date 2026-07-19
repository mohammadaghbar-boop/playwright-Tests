import { test, expect } from '@playwright/test';

/**
 * JF-361 — تفعيل حساب مستخدم خارجي
 * Jira status at generation: Backlog (NOT developed yet)
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-361-*.md
 */
test.describe('JF-361 تفعيل حساب مستخدم خارجي', () => {
  test.fixme('happy path per acceptance criteria', async ({ page }) => {
    // TODO(JF-361): implement from the story's acceptance criteria
    test.info().annotations.push({ type: 'story', description: 'JF-361' });
    expect(true).toBe(true);
  });
});
