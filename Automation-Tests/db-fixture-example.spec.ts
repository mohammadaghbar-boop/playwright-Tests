/**
 * Example spec demonstrating the `db` fixture (fixtures/db-fixture.ts): drive a real
 * UI action, then assert the resulting row directly in Postgres — not just the toast/
 * navigation the UI shows. Uses the JF-575 "Inquiry Authority" create flow as the UI
 * action since it's a simple, single-table write.
 *
 * Requires CB_* credentials in .env (see .env.example / Automation-Tests/README.md) —
 * the DB itself is VPC/IP-restricted, so `db.query()` relays through CloudBeaver rather
 * than connecting to Postgres directly.
 */
import { test, expect } from './fixtures/db-fixture';

const BASE_URL = process.env.BASE_URL ?? 'https://d-infath-jf-portal.azm-cit.com';
// JF-427-DEMO — seeded demo case assigned to demo-liquidator@azm.sa
// (DemoHeirInheritanceSeeder.cs, DemoCourtCaseId).
const DEMO_CASE_ID = 'f0000003-0000-0000-0000-000000000003';

test('creates an inquiry authority via the UI and verifies the row in Postgres, then cleans up', async ({
  page,
  db,
}) => {
  // ── 1) Real login as the seeded Liquidator demo user ──────────────────────
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill('demo-liquidator@azm.sa');
  await page.locator('input[type="password"]').fill('Azm@123');
  await page
    .getByRole('button', { name: /تسجيل الدخول|sign\s*in|log\s*in/i })
    .first()
    .click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });

  // ── 2) UI action: create a uniquely-named inquiry authority ───────────────
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const nameAr = `جهة اختبار قاعدة البيانات ${stamp}`;
  const nameEn = `DB Fixture Test Authority ${stamp}`;

  await page.goto(`${BASE_URL}/court-cases/${DEMO_CASE_ID}/inquiry-authorities/new`);
  await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالعربي').fill(nameAr);
  await page.getByPlaceholder('أدخل اسم جهة الاستعلام بالانجليزي').fill(nameEn);
  await page.locator('lib-dropdown').first().click();
  await page.getByText('وزارة').first().click(); // Ministry

  const createResponse = page.waitForResponse(
    (r) => /\/inquiry-authorities$/.test(r.url().split('?')[0]) && r.request().method() === 'POST',
    { timeout: 15_000 },
  );
  await page.getByTestId('create-submit').click();
  const resp = await createResponse;
  expect(resp.status()).toBe(201);
  const body = (await resp.json()) as { data: { id: string } };
  const createdId = body.data.id;

  try {
    // ── 3) DB verification — the real source of truth, not just the UI's toast ──
    const { rows } = await db.query(
      `SELECT id, court_case_id, name_ar, name_en, entity_type, is_deleted
       FROM cases.case_inquiry_authorities
       WHERE id = $1`,
      [createdId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].court_case_id).toBe(DEMO_CASE_ID);
    expect(rows[0].name_ar).toBe(nameAr);
    expect(rows[0].name_en).toBe(nameEn);
    // CloudBeaver's API returns most column values as strings, not native JS types
    // (only null/boolean come back native) — see utils/db-client.ts's doc comment.
    expect(rows[0].entity_type).toBe('1'); // Ministry
    expect(rows[0].is_deleted).toBe(false);

    // ── 4) UI-level confirmation the row is actually visible, not just persisted ──
    await page.goto(`${BASE_URL}/court-cases/${DEMO_CASE_ID}?tab=inquiries`);
    await expect(page.getByText(nameAr)).toBeVisible({ timeout: 10_000 });
  } finally {
    // ── 5) Cleanup — soft-delete the row this test created so repeated runs don't
    //      accumulate data or trip the per-case duplicate-name check. A hard DELETE
    //      isn't available here: the CloudBeaver-relay db-client only allows SELECT
    //      and UPDATE (see utils/db-client.ts) — this UPDATE is the supported pattern. ──
    await db.query('UPDATE cases.case_inquiry_authorities SET is_deleted = $1 WHERE id = $2', [
      true,
      createdId,
    ]);
  }
});
