import { test, expect } from '@playwright/test';

/**
 * JF-490 — Nafath Identity Verification for Joint Fund Users
 * Jira status at generation: Reopened (dev-complete)
 * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.
 * Full story text: JF-QA-Full-Cycle/system-docs/issues/JF-490-*.md
 */
test.describe('JF-490 Nafath Identity Verification for Joint Fund Users', () => {
  // FE (UI): drive the real screen for this story through the browser.
  test.fixme('@fe JF-490 — UI: user completes the flow on screen', async ({ page }) => {
    // TODO(JF-490/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.
    test.info().annotations.push({ type: 'story', description: 'JF-490' });
    test.info().annotations.push({ type: 'layer', description: 'fe' });
  });
  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.
  test.fixme('@be JF-490 — API: endpoint contract & rules', async () => {
    // TODO(JF-490/BE): call the story's API (src/helpers/api.ts) and assert status + payload.
    test.info().annotations.push({ type: 'story', description: 'JF-490' });
    test.info().annotations.push({ type: 'layer', description: 'be' });
  });
  // DB: verify persisted state (SELECT-only, env-gated on CB_*).
  test.fixme('@db JF-490 — DB: persisted state matches', async () => {
    // TODO(JF-490/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).
    test.info().annotations.push({ type: 'story', description: 'JF-490' });
    test.info().annotations.push({ type: 'layer', description: 'db' });
  });

  // JF-760 [To Do] FE performs no client-side validation on National ID — backend called directly for any 10-digit input — CIT
  test.fixme('regression guard for JF-760 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-760' });
  });

  // JF-761 [To Do] Backend accepts and authenticates National ID starting with 3 — prefix validation missing in backend — CIT
  test.fixme('regression guard for JF-761 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-761' });
  });

  // JF-762 [To Do] IAM/Nafath mandatory fields not saved to DB after successful Nafath verification — CIT
  test.fixme('regression guard for JF-762 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-762' });
  });

  // JF-763 [To Do] Duplicate active Nafath request error message displayed in English instead of Arabic — CIT
  test.fixme('regression guard for JF-763 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-763' });
  });

  // JF-818 [To Do] Active Nafath session not cleared after user cancels — user locked out on retry — CIT
  test.fixme('regression guard for JF-818 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-818' });
  });

  // JF-819 [To Do] Blocked user successfully initiates Nafath verification — block status not checked — CIT
  test.fixme('regression guard for JF-819 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-819' });
  });

  // JF-820 [To Do] "Register in Nafath" option missing from identity verification screen — AC-14 not implemented — CIT
  test.fixme('regression guard for JF-820 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-820' });
  });

  // JF-821 [Rejected] No UNIQUE constraint on identity_number column in user.User table — DB-level uniqueness not enforced — CIT
  test.fixme('regression guard for JF-821 (verify fix)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-821' });
  });

  // JF-822 [To Do] Raw "Failed to fetch" error shown when NIC/IAM data retrieval fails instead of Arabic error message — CIT
  test.fixme('regression guard for JF-822 (bug still open)', async ({ page }) => {
    test.info().annotations.push({ type: 'bug', description: 'JF-822' });
  });
});
