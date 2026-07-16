import { test, expect } from '@playwright/test';

/**
 * JF-360 — Create External User
 * Jira status at generation: Backlog (NOT developed yet)
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-360-*.md
 */
test.describe('JF-360 Create External User', () => {
  test.fixme('happy path per acceptance criteria', async ({ page }) => {
    // TODO(JF-360): implement from the story's acceptance criteria
    test.info().annotations.push({ type: 'story', description: 'JF-360' });
    expect(true).toBe(true);
  });
});
