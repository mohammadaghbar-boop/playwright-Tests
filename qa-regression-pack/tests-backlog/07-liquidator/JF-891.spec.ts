import { test, expect } from '@playwright/test';

/**
 * JF-891 — إنشاء استفسار
 * Jira status at generation: QA (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-891-*.md
 */
test.describe('JF-891 إنشاء استفسار', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-891 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-891/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-891' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-891 — API: endpoint contract & rules', async () => {
    // TODO(JF-891/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-891' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-891 — DB: persisted state matches', async () => {
    // TODO(JF-891/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-891' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-1062 [To Do] [UI] Long unbroken text in inquiry subject/message overflows its container and breaks the layout
  test.fixme('regression guard for JF-1062 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1062' });
  });

  // JF-1063 [To Do] [UI] Estate (التركة) dropdown option text is truncated — INH reference code not fully visible
  test.fixme('regression guard for JF-1063 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1063' });
  });

  // JF-1064 [To Do] [UI] Estate (التركة) dropdown option text is truncated / cut off on the right edge
  test.fixme('regression guard for JF-1064 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1064' });
  });

  // JF-1068 [To Do] Create Inquiry: Attachment validation gaps - extension-only type check, incorrect 50MB limit, silent file drop
  test.fixme('regression guard for JF-1068 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-1068' });
  });
});
