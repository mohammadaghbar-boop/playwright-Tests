import { test, expect } from '@playwright/test';

/**
 * JF-498 — First Login Contact Information Verification
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-498-*.md
 */
test.describe('JF-498 First Login Contact Information Verification', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-498 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-498/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-498' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-498 — API: endpoint contract & rules', async () => {
    // TODO(JF-498/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-498' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-498 — DB: persisted state matches', async () => {
    // TODO(JF-498/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-498' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-740 [To Do] CORS policy blocks WebSocket connection to d-infath-a-ws on Heir dashboard
  test.fixme('regression guard for JF-740 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-740' });
  });

  // JF-741 [To Do] 404 error on /api/v1/auth/token after OTP verification on Register Details screen
  test.fixme('regression guard for JF-741 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-741' });
  });

  // JF-742 [To Do] Missing translation for \'common.close\' key on Register Details screen
  test.fixme('regression guard for JF-742 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-742' });
  });

  // JF-743 [To Do] Invalid email format accepted and saved incorrectly on Register Details screen
  test.fixme('regression guard for JF-743 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-743' });
  });

  // JF-746 [To Do] Expired OTP code accepted after 3-minute timer — backend does not enforce OTP expiry on Register Details scree
  test.fixme('regression guard for JF-746 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-746' });
  });

  // JF-755 [To Do] System does not redirect existing user to Register Details screen when email or phone is missing after Nafath 
  test.fixme('regression guard for JF-755 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-755' });
  });

  // JF-918 [To Do] Email/mobile validation (format & duplicate) check happens after OTP is sent instead of before
  test.fixme('regression guard for JF-918 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-918' });
  });
});
