import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';

/**
 * JF-1092 — Real Estate Inquiry by Deed Number (Add Asset → عقارات → تحقق).
 *
 * Status: Backlog — the Add-Asset تحقق flow (MOJ GetDeedByNumber) is NOT developed,
 * so those acceptance criteria are test.fixme skeletons. The case-level deed-inquiry
 * surface DOES exist on CIT today (…/deed-inquiries/status, …/real-estate-titles/status
 * — verified 2026-07-19) and already returns deed records with owner details, so the
 * inquiry-surface scenarios run LIVE.
 *
 * Outbound (story-documented, MOJ side — NOT called by this spec):
 *   POST https://apitest.infath.gov.sa/moj/deeds/v1/GetDeedByNumber
 *
 * NOTE: the Add Asset screen is a Liquidator flow — when the feature ships, the UI
 * skeletons may need the liquidator storageState (or a move to 07-liquidator).
 */

/** Verified shape of a record on GET …/deed-inquiries/status (CIT 2026-07-19). */
interface DeedInquiryRecord {
  recordId: string;
  deedNumber: string;
  status: number;
  isReInquiryAllowed: boolean;
  linkedAssetIds: string[];
  deedStatus: string | null;
  deedSource: string | null;
  owners: Array<{
    ownerName: string;
    idNumber: string;
    idType: string;
    ownerType: string;
    owningAmount: number | null;
    owningArea: number | null;
  }>;
  deedLimitsJson: string | null;
}

/** Exact GetDeedByNumber request contract (JF-1092 request body). */
interface GetDeedByNumberRequest {
  deedNumber: string;
  /** Hijri year, e.g. "1439". */
  deedDateYear: string;
  /** Hijri month, zero-padded, e.g. "02". */
  deedDateMonth: string;
  /** Hijri day, zero-padded, e.g. "12". */
  deedDateDay: string;
}

test.describe('JF-1092 Real Estate Inquiry by Deed Number', () => {
  let session: ApiSession;
  let caseIds: string[] = [];
  /** deed records found across the seeded estates, resolved once in beforeAll */
  let deedRecords: DeedInquiryRecord[] = [];

  test.beforeAll(async () => {
    session = await apiLogin();
    const list = await apiGet(session, ENDPOINTS.courtCases(1, 20));
    caseIds = ((await list.json())?.data?.items ?? []).map((i: { caseId: string }) => i.caseId);
    for (const id of caseIds) {
      const res = await apiGet(session, ENDPOINTS.deedInquiriesStatus(id));
      if (!res.ok()) continue;
      deedRecords.push(...(((await res.json())?.data ?? []) as DeedInquiryRecord[]));
    }
  });

  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // ---------------------------------------------------------------- LIVE ----

  test('@high deed-inquiries status surface responds with the deed record contract', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    test.skip(!caseIds.length, 'no estates seeded');
    const res = await apiGet(session, ENDPOINTS.deedInquiriesStatus(caseIds[0]));
    expect(res.status()).toBe(200);
    expect((await res.json())?.isSuccess).toBeTruthy();
    expect(deedRecords.length, 'seeded estates should carry at least one deed inquiry record').toBeGreaterThan(0);
    for (const rec of deedRecords) {
      expect(rec.recordId).toBeTruthy();
      expect(rec.deedNumber, 'every deed inquiry is keyed by its deed number').toBeTruthy();
      expect(typeof rec.status).toBe('number');
      expect(typeof rec.isReInquiryAllowed, 'retry affordance exposed (AC: allow the Liquidator to retry)').toBe('boolean');
      expect(Array.isArray(rec.linkedAssetIds)).toBe(true);
    }
  });

  test('@high a succeeded deed inquiry exposes ALL deed owners with identity details', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    // AC: "if multiple owners are returned, the system show all of them, and the
    // liquidator selects" — the surface must expose the complete owner list.
    const withOwners = deedRecords.filter((r) => (r.owners ?? []).length > 0);
    test.skip(!withOwners.length, 'no succeeded deed inquiry with owners on this environment');
    for (const rec of withOwners) {
      for (const owner of rec.owners) {
        expect(owner.ownerName, `deed ${rec.deedNumber}: owner needs a name`).toBeTruthy();
        expect(owner.idNumber, `deed ${rec.deedNumber}: owner needs an id number`).toBeTruthy();
        expect(owner.idType, `deed ${rec.deedNumber}: owner needs an id type`).toBeTruthy();
      }
    }
  });

  test('@medium real-estate-titles status surface responds with its counters contract', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    test.skip(!caseIds.length, 'no estates seeded');
    const res = await apiGet(session, ENDPOINTS.realEstateTitlesStatus(caseIds[0]));
    expect(res.status()).toBe(200);
    const data = (await res.json())?.data;
    expect(data?.courtCaseId).toBe(caseIds[0]);
    expect(typeof data?.status).toBe('number');
    expect(typeof data?.itemsCount).toBe('number');
    expect(typeof data?.totalCount).toBe('number');
  });

  // --------------------------------------------------------------- FIXME ----

  test.fixme('@blocker تحقق sends GetDeedByNumber with رقم الصك and the three Hijri date parts', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    // The integration-log surface for the Add-Asset deed inquiry does not exist yet;
    // once developed, assert the stored request matches the confirmed contract:
    const sent: GetDeedByNumberRequest = {
      deedNumber: '751273403650',
      deedDateYear: '1439',
      deedDateMonth: '02',
      deedDateDay: '12',
    };
    expect(sent.deedNumber).toMatch(/^\d+$/);
    expect(sent.deedDateYear).toMatch(/^\d{4}$/);
    expect(sent.deedDateMonth, 'zero-padded Hijri month').toMatch(/^(0[1-9]|1[0-2])$/);
    expect(sent.deedDateDay, 'zero-padded Hijri day').toMatch(/^(0[1-9]|[12]\d|30)$/);
  });

  test.fixme('@high successful تحقق pre-fills the mapped form fields and locks them read-only', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    // Mapping (story): Data.DeedNo → رقم صك العقار, Data.DeedDate → تاريخ الصك,
    // DeedRealState[0].CityName → المدينة, .DistrictName → الحي, .Area → المساحة,
    // .LocationDescription → الموقع, .PlanNumber → رقم المخطط, .LandNumber → رقم القطعة,
    // .RealEstateTypeName → نوع الصك العقاري; IsRealEstateMortgaged/Halted/
    // Constrained/Testamented → نعم/لا radio fields.
    await page.goto('/'); // → Add Asset screen, asset type عقارات (route TBD when developed)
    await page.getByRole('textbox', { name: 'رقم الصك' }).fill('751273403650');
    await page.getByRole('textbox', { name: 'سنة الصك' }).fill('1439');
    await page.getByRole('textbox', { name: 'شهر الصك' }).fill('02');
    await page.getByRole('textbox', { name: 'يوم الصك' }).fill('12');
    await page.getByRole('button', { name: 'تحقق' }).click();
    const city = page.getByRole('textbox', { name: 'المدينة' });
    await expect(city).toHaveValue('رفحاء');
    await expect(city, 'MOJ-filled fields must be read-only').toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'رقم القطعة' })).toHaveValue('3556');
  });

  test.fixme('@high تحقق is disabled until all four inputs are filled and submission requires a successful تحقق', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    await page.goto('/'); // → Add Asset screen, asset type عقارات
    const verify = page.getByRole('button', { name: 'تحقق' });
    await expect(verify, 'disabled with all inputs empty').toBeDisabled();
    await page.getByRole('textbox', { name: 'رقم الصك' }).fill('751273403650');
    await page.getByRole('textbox', { name: 'سنة الصك' }).fill('1439');
    await page.getByRole('textbox', { name: 'شهر الصك' }).fill('02');
    await expect(verify, 'still disabled while يوم الصك is empty').toBeDisabled();
    await page.getByRole('textbox', { name: 'يوم الصك' }).fill('12');
    await expect(verify).toBeEnabled();
    // AC: the asset cannot be submitted without a completed successful تحقق.
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeDisabled();
  });

  test.fixme('@medium MOJ failure responses show an error and pre-fill nothing (IsSuccess=false / HttpCode 400 / ErrorList)', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    // Exceptions table: IsSuccess=false → show returned message, no pre-fill;
    // HttpCode 400/non-200 → inquiry failed, no pre-fill; deed not found → "deed
    // not found" message; service timeout → clear error + retry allowed.
    await page.goto('/'); // → Add Asset screen, asset type عقارات
    await page.getByRole('textbox', { name: 'رقم الصك' }).fill('000000000000');
    await page.getByRole('textbox', { name: 'سنة الصك' }).fill('1400');
    await page.getByRole('textbox', { name: 'شهر الصك' }).fill('01');
    await page.getByRole('textbox', { name: 'يوم الصك' }).fill('01');
    await page.getByRole('button', { name: 'تحقق' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'المدينة' })).toHaveValue('');
  });

  test.fixme('@medium changing the deed number or date after a successful تحقق clears all pre-filled fields', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1092' });
    await page.goto('/'); // → Add Asset screen, asset type عقارات (after a successful تحقق)
    await page.getByRole('textbox', { name: 'رقم الصك' }).fill('999999999999');
    // AC: edits to رقم الصك or any date part invalidate the retrieval — all MOJ
    // pre-filled fields are cleared and a new تحقق is required before إرسال.
    await expect(page.getByRole('textbox', { name: 'المدينة' })).toHaveValue('');
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeDisabled();
  });
});
