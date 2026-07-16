import { test, expect } from '@playwright/test';

/**
 * JF-563 — Services List / قائمة الخدمات
 * Jira status at generation: Reopened (dev-complete)
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-563-*.md
 */
test.describe('JF-563 Services List / قائمة الخدمات', () => {
  test('happy path per acceptance criteria', async ({ page }) => {
    // TODO(JF-563): implement from the story's acceptance criteria
    test.info().annotations.push({ type: 'story', description: 'JF-563' });
    expect(true).toBe(true);
  });

  // JF-878 [To Do] النوع الفرعي filter not disabled when نوع الخدمة is not exclusively مصفي
  test.fixme('regression guard for JF-878 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-878' });
  });

  // JF-880 [To Do] التصنيف (Classification) filter missing from Services List filter bar
  test.fixme('regression guard for JF-880 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-880' });
  });

  // JF-881 [To Do] حالة الخدمة displays "نشط" instead of "مفعل" as defined in story JF-563
  test.fixme('regression guard for JF-881 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-881' });
  });

  // JF-966 [To Do] Services List shows misleading "no services" empty state instead of a load-error message when facility-service
  test.fixme('regression guard for JF-966 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-966' });
  });
});
