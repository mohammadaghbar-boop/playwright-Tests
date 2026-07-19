import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';

/**
 * JF-1093 — Store MOJ Deed Inquiry Fields in Real Estate Asset Record.
 *
 * Status: Backlog — NOT developed. Depends on JF-1092 (the تحقق deed inquiry): the
 * internal MOJ fields it lists are stored against the asset on save, and
 * القيمة التقديرية للعقار (Data.RealEstatePrice) becomes a visible read-only field.
 * Those criteria are test.fixme skeletons against the asset record surface.
 *
 * LIVE today: the case-level deed-inquiry surface already persists deed metadata
 * (deedStatus, deedSource, owners incl. owningArea) — asserted as the storage
 * precondition contract (verified on CIT 2026-07-19).
 *
 * Related open bug (not annotated here — no live scenario asserts the asset detail
 * sections): JF-305 real-estate asset details missing Deed/Property sections.
 */

/** Internal (داخلي) MOJ fields JF-1093 requires on the stored asset record. */
const INTERNAL_MOJ_FIELDS = [
  'deedSerial', // Data.DeedSerial
  'deedDateGregorian', // Data.DeedDateGregorian
  'deedStatus', // Data.DeedStatus
  'courtCode', // Data.CourtCode
  'deedSource', // Data.DeedSource
  'deedArea', // Data.DeedArea
  'deedAreaText', // Data.DeedAreaText
  'regionCode', // Data.DeedRealState[0].RegionCode
  'cityCode', // Data.DeedRealState[0].CityCode
  'districtCode', // Data.DeedRealState[0].DistrictCode
  'constrained', // Data.DeedRealState[0].CONSTRAINED (1/0)
  'halt', // Data.DeedRealState[0].HALT (1/0)
  'pawned', // Data.DeedRealState[0].PAWNED (1/0)
  'testament', // Data.DeedRealState[0].TESTAMENT (1/0)
  'owningArea', // Data.DeedOwners[0].OwningArea
  'nationality', // Data.DeedOwners[0].Nationality
] as const;

/** GUESS — asset detail surface carrying the stored MOJ block once developed. */
const ASSET_DETAILS = (assetId: string) => `/cases/api/v1/assets/${assetId}`;

test.describe('JF-1093 Store MOJ Deed Inquiry Fields in Real Estate Asset Record', () => {
  let session: ApiSession;
  let caseIds: string[] = [];

  test.beforeAll(async () => {
    session = await apiLogin();
    const list = await apiGet(session, ENDPOINTS.courtCases(1, 20));
    caseIds = ((await list.json())?.data?.items ?? []).map((i: { caseId: string }) => i.caseId);
  });

  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // ---------------------------------------------------------------- LIVE ----

  test('@medium deed-inquiry records already persist the deed metadata the story will store (deedStatus/deedSource/owners)', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1093' });
    // Storage precondition: the inquiry pipeline must keep the deed metadata a saved
    // asset will copy. A succeeded record (INH00016-style fixture) carries deedStatus,
    // deedSource and owner rows with the owningArea field JF-1093 stores internally.
    let found: Record<string, unknown> | undefined;
    for (const id of caseIds) {
      const res = await apiGet(session, ENDPOINTS.deedInquiriesStatus(id));
      if (!res.ok()) continue;
      const records: Array<Record<string, unknown>> = (await res.json())?.data ?? [];
      found = records.find((r) => r.deedStatus != null && Array.isArray(r.owners) && (r.owners as unknown[]).length > 0);
      if (found) break;
    }
    test.skip(!found, 'no succeeded deed inquiry with persisted metadata on this environment');
    const rec = found!;
    expect(rec.deedStatus, 'deed status persisted (e.g. "Active")').toBeTruthy();
    expect(rec.deedSource, 'issuing source persisted (e.g. "SREM")').toBeTruthy();
    for (const owner of rec.owners as Array<Record<string, unknown>>) {
      // Internal per-owner fields of the story's data dictionary must exist as
      // properties even while null — "stored even if null, 0, or empty string".
      expect(owner, 'owner record exposes owningArea').toHaveProperty('owningArea');
      expect(owner, 'owner record exposes owningAmount').toHaveProperty('owningAmount');
      expect(owner.idNumber).toBeTruthy();
    }
  });

  // --------------------------------------------------------------- FIXME ----

  test.fixme('@high all internal MOJ fields are stored against the asset record on successful submission', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1093' });
    // Precondition: تحقق succeeded (IsSuccess = true, HttpCode = 200) and the asset
    // was saved. The stored block must cover the full data dictionary.
    const assetId = ''; // resolve a saved real-estate asset once the feature exists
    const res = await apiGet(session, ASSET_DETAILS(assetId));
    expect(res.status()).toBe(200);
    const moj = (await res.json())?.data?.mojDeedInquiry as Record<string, unknown>;
    expect(moj, 'saved real-estate asset carries the stored MOJ block').toBeTruthy();
    for (const field of INTERNAL_MOJ_FIELDS) {
      expect(moj, `internal MOJ field "${field}" must be stored`).toHaveProperty(field);
    }
    for (const flag of ['constrained', 'halt', 'pawned', 'testament'] as const) {
      expect([0, 1], `${flag} stored as the numeric MOJ flag`).toContain(moj[flag]);
    }
  });

  test.fixme('@high القيمة التقديرية للعقار (Data.RealEstatePrice) is a visible read-only field on Add Asset and asset details', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1093' });
    // The ONLY ظاهر field of the dictionary: shown pre-filled (read-only) in the
    // real-estate data section of Add Asset, and again on the asset details screen.
    await page.goto('/'); // → Add Asset screen after a successful تحقق (route TBD)
    const price = page.getByRole('textbox', { name: 'القيمة التقديرية للعقار' });
    await expect(price).toBeVisible();
    await expect(price).toHaveValue(/\d/);
    await expect(price, 'populated from MOJ, never editable').toBeDisabled();
    await page.goto('/'); // → saved asset details screen (route TBD)
    await expect(page.getByText('القيمة التقديرية للعقار')).toBeVisible();
  });

  test.fixme('@medium internal fields are stored even when null, 0 or empty string', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1093' });
    // e.g. PlanNumber null, HALT/PAWNED/TESTAMENT 0 — keys must still exist on the
    // stored block rather than being dropped.
    const assetId = ''; // resolve an asset whose MOJ response contained nulls/zeros
    const res = await apiGet(session, ASSET_DETAILS(assetId));
    const moj = (await res.json())?.data?.mojDeedInquiry as Record<string, unknown>;
    for (const field of INTERNAL_MOJ_FIELDS) {
      expect(moj, `"${field}" present even when null/0/empty`).toHaveProperty(field);
    }
  });

  test.fixme('@medium stored MOJ fields are linked by asset reference number and Inheritance File ID', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1093' });
    const assetId = ''; // resolve a saved real-estate asset once the feature exists
    const res = await apiGet(session, ASSET_DETAILS(assetId));
    const data = (await res.json())?.data;
    expect(data?.assetNumber, 'linkage key: asset reference number (AST-…)').toMatch(/^AST-\d{4}-\d{6}$/);
    expect(data?.courtCaseId, 'linkage key: Inheritance File ID').toBeTruthy();
  });
});
