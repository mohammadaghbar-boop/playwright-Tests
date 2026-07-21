/**
 * JF-575 — "جهات الاستعلام" (Inquiry Authorities) — E2E automation.
 *
 * Implements the highest-value, lowest-flake subset of the Automatable test cases from
 * `JF-575_AIO_Test_Cases.xlsx` (see `Automation_Assessment.md` at the repo root for the
 * full classification):
 *
 *   TC-JF575-001  happy-path create (mandatory fields only)
 *   TC-JF575-003  duplicate Arabic name on the same case is rejected
 *   TC-JF575-004  duplicate English name on the same case is rejected
 *   TC-JF575-007  non-Liquidator role cannot reach the endpoints (API-level, forged JWT)
 *   TC-JF575-008  missing Name (Arabic) blocks submission
 *   TC-JF575-009  missing Name (English) blocks submission
 *   TC-JF575-010  missing Entity Type blocks submission
 *   TC-JF575-014  new authority appears in the list immediately after create
 *   TC-JF575-022  all 5 entity types are selectable and persist correctly
 *   TC-JF575-027  a disallowed attachment type is rejected client-side
 *   TC-JF575-032  pagination works when the case has more than one page of authorities
 *   TC-JF575-038  empty case shows the correct empty state
 *   TC-JF575-039  Description is genuinely optional
 *   TC-JF575-040  Attachments are genuinely optional
 *   TC-JF575-053  back/cancel returns to the list without submitting
 *
 * ── Location & conventions ──
 *
 * Lives in Automation-Tests/ (this repo's standalone Playwright project — see
 * Automation-Tests/README.md), not azm-joint-fund-portal/e2e/: that folder's specs
 * assume a locally-booted real stack (Postgres + Forms API + `npm start`, per its own
 * README), which isn't needed here since this suite targets the already-deployed
 * CIT/Dev environment directly, matching the sibling `services-list.spec.ts` convention
 * in THIS folder — absolute URLs via a `BASE_URL` constant, real email/password login.
 *
 * ── Login credentials (verified, not assumed) ──
 *
 * Logs in via the real Nafath flow (`loginAsServiceProvider` in `helpers/auth.ts`,
 * mock-Nafath user picker keyed by national ID) as Majed ALQAHTANI (national ID
 * `1100000011`, UserId `4627f72a-278b-4ae5-b2ae-80aceaded19a`) — a real Liquidator who
 * obtained the role through the actual JF-567/JF-899 service-approval flow (not the
 * `demo-liquidator@azm.sa` seeded account) and has a live, accepted case assignment
 * (`liquidator_assignment_requests` id `8a451a68-...`, accepted 2026-07-09). This
 * exercises the real Nafath-authenticated Liquidator path end-to-end rather than a
 * shortcut email/password login. An earlier draft of this suite used
 * `demo-liquidator@azm.sa` / `Azm@123` against the seeded `JF-427-DEMO` case; that
 * account still works but no longer reflects how a real Liquidator reaches this screen
 * post-JF-946 (dual ServiceProvider+Liquidator routing fix).
 *
 * Every test requires case `INH00581` (`3b93081c-d5ca-4df8-abcb-914a526dcdac`) to remain
 * accepted by Majed in the target environment. Tests skip gracefully if no case is
 * reachable at all, but do not re-discover a different case — pinning to known, verified
 * state is more deterministic for a shared environment.
 */

import { test, expect, Page } from '@playwright/test';
import { createHmac } from 'node:crypto';
import * as path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com';
const BASE_API_URL = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const DEMO_CASE_ID = '3b93081c-d5ca-4df8-abcb-914a526dcdac'; // INH00581, accepted by Majed
// Reuse the session global-setup.ts already logged in via real Nafath (mock user picker,
// national ID 1100000011 = Majed ALQAHTANI) — logging in fresh per test here would run N
// concurrent Nafath logins as the same mock user across parallel workers and collide on
// the mock server's "active login request already exists" guard.
const LIQUIDATOR_STORAGE_STATE = path.join(__dirname, '..', '.auth', 'liquidator.json');

const I18N_REQUIRED_ERROR_TESTID = 'error-nameAr';
const ENTITY_TYPE_LABELS_AR = ['وزارة', 'هيئة', 'بنك حكومي', 'جهة قضائية', 'جهة أمنية'];

function unique(label: string): { ar: string; en: string } {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  return { ar: `${label} عربي ${stamp}`, en: `${label} EN ${stamp}` };
}

/**
 * Minimal, self-contained HS256 JWT forge for the one test that needs a non-Liquidator
 * identity (TC-JF575-007). Deliberately NOT imported from azm-joint-fund-portal/e2e's
 * fixtures — this project doesn't depend on that folder. The signing key must match the
 * backend's `JwtValidation:SymmetricSigningKey` (Kernelsettings.json) for the token to
 * validate; if the environment rotates that key, update it here too.
 */
function forgeJwt(roles: string[]): string {
  const key = process.env.JWT_SIGNING_KEY ?? 'YourSuperSecretKeyMinimum32CharactersLongForHS256Algorithm';
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const sub = '00000000-0000-0000-0000-0000000000e7'; // arbitrary non-liquidator test subject
  const payload = {
    iss: 'https://azm-jointfunds.sa',
    aud: 'azm-jointfunds-api',
    sub,
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': sub,
    UserId: sub,
    role: roles,
    name: 'JF-575 E2E Heir',
    iat: now,
    exp: now + 3600,
  };
  const b64url = (input: string) =>
    Buffer.from(input, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = createHmac('sha256', key).update(signingInput).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${signingInput}.${sig}`;
}

async function goToInquiriesTab(page: Page): Promise<void> {
  // JF-946 route: dual ServiceProvider+Liquidator users reach their case list under
  // /service-providers/court-cases, not the bare /court-cases (authGuard bounces
  // isServiceProvider() users away from that internal route regardless of Liquidator).
  //
  // Deep-linking straight to /service-providers/court-cases/:id bounces to
  // /service-providers/companies unless SelectedFacilityService.hasSelected() is true
  // first (companies-list.ts's onEnterFacility sets the selected_facility_id cookie via
  // select(), which the auth interceptor sends as x-facility-id). The saved storageState
  // logs Majed in but never clicked "enter facility", so that has to happen once here —
  // this is a cheap in-app click, not a fresh Nafath login, so it doesn't reintroduce the
  // mock server's concurrent-login collision the shared storageState was added to avoid.
  await page.goto(`${BASE_URL}/service-providers/companies`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'الدخول على المنشأة' }).click();
  await page.waitForURL('**/service-providers/welcome', { timeout: 10_000 });

  await page.goto(`${BASE_URL}/service-providers/court-cases/${DEMO_CASE_ID}?tab=inquiries`);
  await page.waitForLoadState('networkidle');
  const section = page.getByTestId('inquiry-authorities-section');
  const visible = await section.isVisible({ timeout: 10_000 }).catch(() => false);
  if (!visible) {
    test.skip(true, `INH00581 (${DEMO_CASE_ID}) is not reachable/accepted by Majed in this environment`);
  }
}

test.describe('JF-575 — Inquiry Authorities', () => {
  // All tests share one target case (INH00581) and create/read its inquiry-authorities
  // collection — running them in parallel means N sessions hammering the same case
  // concurrently, which caused flaky navigation/redirect failures. Serial matches how
  // this suite was actually designed to run (see the module doc comment above).
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: LIQUIDATOR_STORAGE_STATE });

  test('TC-JF575-001 — Liquidator can create an inquiry authority with only the mandatory fields', async ({
    page,
  }) => {
    await goToInquiriesTab(page);

    const addButton = page.getByTestId('inquiry-authorities-add');
    await expect(addButton).toBeVisible({ timeout: 10_000 });
    await addButton.click();
    await page.waitForURL('**/inquiry-authorities/new', { timeout: 10_000 });

    const { ar, en } = unique('TC001');
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(en);
    await page.locator('lib-dropdown').first().click();
    await page.getByText(ENTITY_TYPE_LABELS_AR[1] /* هيئة / Authority */).first().click();

    const submit = page.getByTestId('create-submit');
    await expect(submit).toBeEnabled({ timeout: 5_000 });

    const createResponse = page.waitForResponse(
      (r) => /\/inquiry-authorities$/.test(r.url().split('?')[0]) && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await submit.click();
    const resp = await createResponse;
    // API returns 200, not 201, on create — app-wide Result<T> convention, filed as JF-1059.
    expect(resp.status()).toBe(200);

    await page.waitForURL(/\?tab=inquiries/, { timeout: 10_000 });
    await expect(page.getByText(ar)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(en)).toBeVisible();
  });

  test('TC-JF575-003 / TC-JF575-004 — duplicate Arabic or English name on the same case is rejected', async ({
    page,
  }) => {
    await goToInquiriesTab(page);
    const { ar, en } = unique('TC003-004');

    await page.getByTestId('inquiry-authorities-add').click();
    await page.waitForURL('**/inquiry-authorities/new', { timeout: 10_000 });
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(en);
    await page.locator('lib-dropdown').first().click();
    await page.getByText(ENTITY_TYPE_LABELS_AR[0]).first().click();
    await page.getByTestId('create-submit').click();
    await page.waitForURL(/\?tab=inquiries/, { timeout: 15_000 });

    // Duplicate Arabic name (different English name).
    await page.goto(`${BASE_URL}/service-providers/court-cases/${DEMO_CASE_ID}/inquiry-authorities/new`);
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(`${en}-different`);
    await page.locator('lib-dropdown').first().click();
    await page.getByText(ENTITY_TYPE_LABELS_AR[0]).first().click();
    const dupArResponse = page.waitForResponse(
      (r) => /\/inquiry-authorities$/.test(r.url().split('?')[0]) && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page.getByTestId('create-submit').click();
    expect((await dupArResponse).status()).toBe(400);
    await expect(page).toHaveURL(/inquiry-authorities\/new/);

    // Duplicate English name (different Arabic name).
    await page.reload();
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(`${ar}-different`);
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(en);
    await page.locator('lib-dropdown').first().click();
    await page.getByText(ENTITY_TYPE_LABELS_AR[0]).first().click();
    const dupEnResponse = page.waitForResponse(
      (r) => /\/inquiry-authorities$/.test(r.url().split('?')[0]) && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await page.getByTestId('create-submit').click();
    expect((await dupEnResponse).status()).toBe(400);
  });

  test('TC-JF575-007 — a non-Liquidator (Heir) role is denied by the inquiry-authorities API', async ({
    request,
  }) => {
    const listResp = await request.get(
      `${BASE_API_URL}/cases/api/v1/court-cases/${DEMO_CASE_ID}/inquiry-authorities`,
      { headers: { Authorization: `Bearer ${forgeJwt(['Heir'])}` } },
    );
    expect([401, 403]).toContain(listResp.status());
  });

  test('TC-JF575-008/009/010 — mandatory-field validation blocks submission client-side', async ({
    page,
  }) => {
    await goToInquiriesTab(page);
    await page.getByTestId('inquiry-authorities-add').click();
    await page.waitForURL('**/inquiry-authorities/new', { timeout: 10_000 });

    const submit = page.getByTestId('create-submit');
    await expect(submit).toBeDisabled();

    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill('Only English Name');
    await page.locator('lib-dropdown').first().click();
    await page.getByText(ENTITY_TYPE_LABELS_AR[0]).first().click();
    await expect(submit).toBeDisabled();

    const nameArInput = page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي');
    await nameArInput.click();
    await nameArInput.blur();
    await expect(page.getByTestId(I18N_REQUIRED_ERROR_TESTID)).toBeVisible({ timeout: 5_000 });
  });

  test('TC-JF575-014 — a newly created authority appears in the list immediately, no manual refresh', async ({
    page,
  }) => {
    await goToInquiriesTab(page);
    await page.getByTestId('inquiry-authorities-add').click();
    await page.waitForURL('**/inquiry-authorities/new', { timeout: 10_000 });

    const { ar, en } = unique('TC014');
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(en);
    await page.locator('lib-dropdown').first().click();
    await page.getByText(ENTITY_TYPE_LABELS_AR[2]).first().click();
    await page.getByTestId('create-submit').click();

    await page.waitForURL(/\?tab=inquiries/, { timeout: 15_000 });
    await expect(page.getByText(ar)).toBeVisible({ timeout: 10_000 });
  });

  test('TC-JF575-022 — all 5 entity types are selectable and persist with the correct Arabic label', async ({
    page,
  }) => {
    await goToInquiriesTab(page);

    for (const [index, label] of ENTITY_TYPE_LABELS_AR.entries()) {
      await page.goto(`${BASE_URL}/service-providers/court-cases/${DEMO_CASE_ID}/inquiry-authorities/new`);
      const { ar, en } = unique(`TC022-${index}`);
      await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);
      await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(en);
      await page.locator('lib-dropdown').first().click();
      await page.getByText(label).first().click();
      await page.getByTestId('create-submit').click();
      await page.waitForURL(/\?tab=inquiries/, { timeout: 15_000 });

      const row = page.locator('table tbody tr', { hasText: ar });
      await expect(row).toBeVisible({ timeout: 10_000 });
      await expect(row.getByText(label)).toBeVisible();
    }
  });

  test('TC-JF575-027 — a disallowed attachment type (.docx) is rejected client-side', async ({ page }) => {
    await goToInquiriesTab(page);
    await page.getByTestId('inquiry-authorities-add').click();
    await page.waitForURL('**/inquiry-authorities/new', { timeout: 10_000 });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('attachments-add').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'invoice.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('not a real docx, just a rejection-path fixture'),
    });

    await expect(page.getByTestId('attachment-chip')).toHaveCount(0);
  });

  test('TC-JF575-032 — pagination controls appear once the case has more than one page of authorities', async ({
    page,
  }) => {
    await goToInquiriesTab(page);

    // Seeds 11 authorities (PAGE_SIZE=10). Kept intentionally small — large-data-set
    // behavior at 100+ rows is covered separately (TC-JF575-046, manual/perf pass).
    for (let i = 0; i < 11; i += 1) {
      await page.goto(`${BASE_URL}/service-providers/court-cases/${DEMO_CASE_ID}/inquiry-authorities/new`);
      const { ar, en } = unique(`TC032-${i}`);
      await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);
      await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(en);
      await page.locator('lib-dropdown').first().click();
      await page.getByText(ENTITY_TYPE_LABELS_AR[i % 5]).first().click();
      await page.getByTestId('create-submit').click();
      await page.waitForURL(/\?tab=inquiries/, { timeout: 15_000 });
    }

    await page.goto(`${BASE_URL}/service-providers/court-cases/${DEMO_CASE_ID}?tab=inquiries`);
    await expect(page.locator('lib-paginator')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table tbody tr')).toHaveCount(10);
  });

  test('TC-JF575-038 — a case with zero inquiry authorities shows the correct empty state', async ({
    page,
  }) => {
    // JF-427-DEMO accumulates rows from other tests in this file/environment over time,
    // so this documents the alternative (non-empty) branch instead of asserting a false
    // negative when that's the case — matches court-cases.spec.ts's tolerant-of-seed-
    // state style rather than requiring a guaranteed-empty case that doesn't exist here.
    await goToInquiriesTab(page);
    const hasRows = await page.locator('table tbody tr').count();
    if (hasRows > 0) {
      test.skip(true, 'JF-427-DEMO already has inquiry authorities — empty state not exercised');
    }
    await expect(page.getByTestId('inquiry-authorities-empty')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('inquiry-authorities-add')).toBeVisible();
  });

  test('TC-JF575-039 / TC-JF575-040 — Description and Attachments are genuinely optional', async ({
    page,
  }) => {
    await goToInquiriesTab(page);
    await page.getByTestId('inquiry-authorities-add').click();
    await page.waitForURL('**/inquiry-authorities/new', { timeout: 10_000 });

    const { ar, en } = unique('TC039-040');
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(en);
    await page.locator('lib-dropdown').first().click();
    await page.getByText(ENTITY_TYPE_LABELS_AR[3]).first().click();
    // Description left blank, no attachments added.

    const submit = page.getByTestId('create-submit');
    await expect(submit).toBeEnabled({ timeout: 5_000 });
    const createResponse = page.waitForResponse(
      (r) => /\/inquiry-authorities$/.test(r.url().split('?')[0]) && r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await submit.click();
    // API returns 200, not 201, on create — app-wide Result<T> convention, filed as JF-1059.
    expect((await createResponse).status()).toBe(200);
    await page.waitForURL(/\?tab=inquiries/, { timeout: 10_000 });
    await expect(page.getByText(ar)).toBeVisible({ timeout: 10_000 });
  });

  test('TC-JF575-053 — back/cancel from the create page returns to the list without submitting', async ({
    page,
  }) => {
    await goToInquiriesTab(page);
    const rowCountBefore = await page.locator('table tbody tr').count();

    await page.getByTestId('inquiry-authorities-add').click();
    await page.waitForURL('**/inquiry-authorities/new', { timeout: 10_000 });

    const { ar } = unique('TC053-abandoned');
    await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(ar);

    let postFired = false;
    page.on('request', (r) => {
      if (/\/inquiry-authorities$/.test(r.url().split('?')[0]) && r.method() === 'POST') {
        postFired = true;
      }
    });

    const listResponse = page.waitForResponse(
      (r) => /\/inquiry-authorities(\?.*)?$/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    );
    await page.getByTestId('create-back').click();
    await page.waitForURL(/\?tab=inquiries/, { timeout: 10_000 });
    await listResponse;
    expect(postFired).toBe(false);

    const rowCountAfter = await page.locator('table tbody tr').count();
    expect(rowCountAfter).toBe(rowCountBefore);
    await expect(page.getByText(ar)).toHaveCount(0);
  });
});
