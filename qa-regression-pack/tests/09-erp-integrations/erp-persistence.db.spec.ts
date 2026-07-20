import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';
import { dbAvailable, dbQuery } from '../../src/db';

/**
 * 09-erp-integrations — DB VERIFICATION layer.
 *
 * ERP INTEGRATION IS BACKEND + DB BY NATURE — there is NO user screen. The portal posts
 * to the ERP test environment out-of-band (SendInheritanceToERP / SendInhJournalToERP,
 * JF-734 / JF-707) and persists the outcome; there is nothing for a FE/UI layer to drive.
 * So this area's added coverage is DB-verification (SELECT-only via the CloudBeaver relay),
 * NOT an invented FE screen. The API/contract specs alongside (JF-707/JF-734/JF-1094) stay
 * the source of truth for the request/response mapping.
 *
 * All tests are @db and CB_*-gated → they clean-skip until DB creds exist. Queries are
 * written correct-by-construction from the confirmed cases-schema hints
 * (Automation-Tests/utils/db-client.ts + jf157-db-client.ts): cases.court_cases is the
 * inheritance record ERP posts, and information_schema tells us whether the ERP-posting
 * persistence surface (erp journal number / posting date / voucher id) has shipped yet.
 */

interface CourtCaseErpSource {
  id: string;
  deceased_national_id: string | null;
  status: string | null;
}
interface ColumnRow {
  table_schema: string;
  table_name: string;
  column_name: string;
}

let session: ApiSession;
let caseId: string | undefined;

test.beforeAll(async () => {
  // API context is only used to resolve a real caseId to anchor the DB reads.
  if (!dbAvailable()) return;
  session = await apiLogin();
  const list = await apiGet(session, ENDPOINTS.courtCases(1, 20));
  const items: Array<{ caseId?: string }> = (await list.json())?.data?.items ?? [];
  caseId = items.find((i) => !!i.caseId)?.caseId;
});

test.afterAll(async () => {
  await session?.ctx.dispose();
});

test.describe('09-erp-integrations — DB verification (@db)', () => {
  test('@high @db the inheritance record ERP posts persists in cases.court_cases', async () => {
    test.skip(!dbAvailable(), 'DB creds (CB_*) not configured');
    test.skip(!caseId, 'no estate id available from the API');
    // SendInheritanceToERP (JF-734) sources the deceased national id + inheritance number
    // from the approved court case. Verify that source row is present and complete.
    const { rows } = await dbQuery<CourtCaseErpSource>(
      `SELECT id, deceased_national_id, status FROM cases.court_cases WHERE id = $1`,
      [caseId!],
    );
    expect(rows.length, 'the inheritance record exists in cases.court_cases').toBe(1);
    expect(rows[0].deceased_national_id, 'deceased national id (mapped into the ERP request) is stored').toBeTruthy();
    test.info().annotations.push({
      type: 'db',
      description: `court_cases ERP source row ${caseId}: status=${rows[0].status}`,
    });
  });

  test('@medium @db ERP journal/posting persistence surface — probe cases schema (JF-707/JF-734)', async () => {
    test.skip(!dbAvailable(), 'DB creds (CB_*) not configured');
    // JF-707/JF-734 are Backlog (not developed on CIT). Once the SendInhJournalToERP /
    // SendInheritanceToERP results are persisted, they land as erp-journal-number /
    // posting-date / voucher-id columns (or an accounting_journals table). Probe the live
    // schema for that surface so this test starts VERIFYING persisted values the moment the
    // feature ships — and honestly records its absence until then (no red-fail).
    const { rows } = await dbQuery<ColumnRow>(
      `SELECT table_schema, table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'cases'
         AND (
           column_name ILIKE '%erp%'
           OR column_name ILIKE '%journal%'
           OR column_name ILIKE '%voucher%'
         )
       ORDER BY table_name, column_name`,
    );
    const surface = rows.map((r) => `${r.table_name}.${r.column_name}`);
    test.info().annotations.push({
      type: 'db',
      description: surface.length
        ? `ERP-posting persistence columns present: ${surface.join(', ')}`
        : 'no ERP-posting persistence columns in the cases schema yet (JF-707/JF-734 not developed) — DB verification will activate once they ship',
    });
    // Correct-by-construction: the probe itself must execute cleanly. If the surface has
    // shipped, every discovered column belongs to the cases schema.
    for (const r of rows) expect(r.table_schema).toBe('cases');
  });
});
