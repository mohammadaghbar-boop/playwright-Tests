import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';
import { annotateKnownIssue } from '../../src/known-issues';

/**
 * JF-1094 — Send Asset Dimension to ERP (CreateInhDimension).
 *
 * Status: Backlog — NOT developed on CIT. The ERP call itself is fixme-skeletoned;
 * what IS live-assertable today is the dimension's SOURCE data on the existing
 * grouped-assets surface: `dimensionId` = the asset reference number (AST-…),
 * `inheritanceNumber` = the file number (INH…), `amount` = the asset value.
 * JF-1100 (AVM per-asset value never stored) breaks the `amount` source for real
 * estate assets — that scenario is annotated so it reports as KNOWN.
 *
 * Outbound (story-documented, ERP side — NOT called by this spec):
 *   POST https://apitest.infath.gov.sa/erp/inheritance/v1/CreateInhDimension
 * Portal-side observation surface is a GUESS pending development:
 *   GET /cases/api/v1/assets/{assetId}/erp-dimension
 */

/** Exact _inhDimensionContract request (JF-1094 request mapping). */
interface InhDimensionContract {
  _inhDimensionContract: {
    /** Internal asset reference number, e.g. "AST-2026-000158". */
    dimensionId: string;
    /** Business rule: "fill it as the asset ID". */
    dimensionDescription: string;
    /** Lookup code (e.g. "9") — pending verification. */
    dimensionType: string;
    /** Inheritance number from our system, e.g. "INH00012". */
    inheritanceNumber: string;
    /** Bank associated with the inheritance file — lookup pending verification. */
    bank: string;
    /** القيمة في صك الحكم or القيمة التقديرية للأصل depending on asset type. */
    amount: string;
    /** Always arrays — business rule: "send empty for now", never omit. */
    wills: Array<{ willId: string; willPercentage: string; willAmount: string }>;
    partners: Array<{ partnerId: string; partnerAmount: string }>;
    rentalContracts: Array<{
      contractId: string;
      isVatApplicable: string;
      totalContractAmount: string;
      contractStartDate: string;
      contractEndDate: string;
      proofOfContract: string;
    }>;
  };
}

/** Exact CreateInhDimension_Resp contract (confirmed Postman examples). */
interface InhDimensionErpResponse {
  /** "200" = success, "400" = failed (e.g. "Inheritance does not exist in the system"). */
  code: string;
  message: string;
  /** Stored against the asset record on success; empty on failure. */
  erpDimensionId: string;
}

/** Shape of an asset item on the (verified) grouped-assets surface. */
interface GroupedAsset {
  assetId: string;
  assetNumber: string;
  assetType: number; // 1 = عقار (real estate)
  estimatedValue: number | null;
  courtCaseFileNumber: string;
}

/** GUESS — portal-side integration surface; align once JF-1094 is developed. */
const ERP_DIMENSION = (assetId: string) => `/cases/api/v1/assets/${assetId}/erp-dimension`;

test.describe('JF-1094 Send Asset Dimension to ERP (CreateInhDimension)', () => {
  let session: ApiSession;
  let assets: GroupedAsset[] = [];

  test.beforeAll(async () => {
    session = await apiLogin();
    const list = await apiGet(session, ENDPOINTS.courtCases(1, 20));
    const cases: Array<{ caseId: string }> = (await list.json())?.data?.items ?? [];
    for (const c of cases.slice(0, 10)) {
      const res = await apiGet(session, ENDPOINTS.assetsByCaseGrouped(c.caseId));
      if (!res.ok()) continue;
      const data = (await res.json())?.data ?? {};
      for (const group of [...(data.grouped ?? []), ...(data.ungrouped ?? [])]) {
        assets.push(...((group.assets ?? []) as GroupedAsset[]));
      }
    }
  });

  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // ---------------------------------------------------------------- LIVE ----

  test('@high dimension source identifiers exist on every asset (dimensionId ← assetNumber, inheritanceNumber ← file number)', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1094' });
    expect(assets.length, 'seeded estates must expose assets').toBeGreaterThan(0);
    for (const a of assets) {
      expect(a.assetNumber, `asset ${a.assetId} needs an AST reference for dimensionId`).toMatch(/^AST-\d{4}-\d{6}$/);
      expect(a.courtCaseFileNumber, `asset ${a.assetNumber} needs a file number for inheritanceNumber`).toMatch(/^INH\d+$/);
    }
  });

  test('@medium real estate assets carry a stored value for the dimension amount source (guards JF-1100)', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1094' });
    // CreateInhDimension.amount is mandatory and sourced from the asset's value.
    // JF-1100 (AVM per-asset value never stored) leaves estimatedValue null on all
    // real-estate assets, so the dimension request could never be built for them.
    // Fails as KNOWN while JF-1100 is open; a pass = "possibly fixed — verify & remove".
    annotateKnownIssue(test, 'JF-1100');
    const realEstate = assets.filter((a) => a.assetType === 1);
    test.skip(!realEstate.length, 'no real estate assets seeded');
    const valued = realEstate.filter((a) => a.estimatedValue != null && a.estimatedValue > 0);
    expect(
      valued.length,
      `no real-estate asset has a stored value (${realEstate.length} checked) — amount source unavailable`,
    ).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------- FIXME ----

  test.fixme('@blocker adding an asset triggers CreateInhDimension with the mandatory dimension contract', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1094' });
    // Trigger: asset successfully added (manually by the Liquidator OR via
    // integration). Precondition: SendInheritanceToERP succeeded for the file (JF-734).
    const asset = assets[0];
    const res = await apiGet(session, ERP_DIMENSION(asset.assetId));
    expect(res.status()).toBe(200);
    const logged = (await res.json())?.data?.request as InhDimensionContract;
    const d = logged._inhDimensionContract;
    expect(d.dimensionId, 'dimensionId = internal asset reference number').toBe(asset.assetNumber);
    expect(d.dimensionDescription, 'dimensionDescription filled as the asset ID').toBeTruthy();
    expect(d.dimensionType, 'dimensionType lookup code (pending verification)').toBeTruthy();
    expect(d.inheritanceNumber).toBe(asset.courtCaseFileNumber);
    expect(d.bank, 'bank derived from the inheritance file banking data').toBeTruthy();
    expect(Number(d.amount), 'amount = total financial amount of the asset').toBeGreaterThan(0);
  });

  test.fixme('@high wills, partners and rentalContracts are always sent as arrays — empty [] for now, never omitted', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1094' });
    const res = await apiGet(session, ERP_DIMENSION(assets[0].assetId));
    const logged = (await res.json())?.data?.request as InhDimensionContract;
    const d = logged._inhDimensionContract;
    // Business rule: "Wills, Partners and rentalContracts are optional in this
    // service, send empty for now" — but the keys must always be present as arrays.
    expect(Array.isArray(d.wills)).toBe(true);
    expect(Array.isArray(d.partners)).toBe(true);
    expect(Array.isArray(d.rentalContracts)).toBe(true);
    expect(d.wills).toEqual([]);
    expect(d.partners).toEqual([]);
    expect(d.rentalContracts).toEqual([]);
  });

  test.fixme('@high success stores erpDimensionId against the asset; code 200 with empty erpDimensionId is incomplete', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1094' });
    const res = await apiGet(session, ERP_DIMENSION(assets[0].assetId));
    const data = (await res.json())?.data;
    const erp = data?.response as InhDimensionErpResponse;
    if (erp?.code === '200') {
      expect(erp.erpDimensionId, 'code 200 with empty erpDimensionId → flag for technical review').toBeTruthy();
      expect(data?.erpDimensionId, 'erpDimensionId persisted against the asset record').toBe(erp.erpDimensionId);
    }
  });

  test.fixme('@medium ERP 400 "Inheritance does not exist" marks the attempt failed with no automatic retry', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1094' });
    // Business rule: if the inheritance is not in ERP yet, mark failed, store the
    // ERP message, and do NOT retry until the inheritance is confirmed in ERP.
    // (Technical errors/timeouts, by contrast, retry after 5 then 15 minutes.)
    const res = await apiGet(session, ERP_DIMENSION(assets[0].assetId));
    const data = (await res.json())?.data;
    const erp = data?.response as InhDimensionErpResponse;
    if (erp?.code === '400') {
      expect(data?.status).toBe('Failed');
      expect(data?.errorMessage, 'ERP failure message stored in the integration log').toBeTruthy();
      const attempts: Array<unknown> = data?.attempts ?? [];
      expect(attempts.length, 'business-validation failure is not auto-retried').toBe(1);
    }
  });

  test.fixme('@medium a dimension already sent successfully is never sent to ERP again', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1094' });
    const res = await apiGet(session, ERP_DIMENSION(assets[0].assetId));
    const attempts: Array<{ status?: string }> = (await res.json())?.data?.attempts ?? [];
    const successes = attempts.filter((a) => a.status === 'Success');
    expect(successes.length, 'duplicate send prevention: at most one successful CreateInhDimension per asset').toBeLessThanOrEqual(1);
  });
});
