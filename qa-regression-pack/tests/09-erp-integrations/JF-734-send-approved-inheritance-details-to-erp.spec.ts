import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';

/**
 * JF-734 — Send Approved Inheritance Details to ERP (SendInheritanceToERP).
 *
 * Status: Backlog — NOT developed on CIT (Sprint-13 groomed). Every scenario is a
 * test.fixme skeleton derived from the story's acceptance criteria; field names are
 * quoted verbatim from the confirmed ERP contract. Un-fixme once the integration ships.
 *
 * Outbound (story-documented, ERP side — NOT called by this spec):
 *   POST https://apitest.infath.gov.sa/erp/inheritance/v1/SendInheritanceToERP
 * Portal-side observation surface is a GUESS pending development, modeled on the
 * existing inquiry-status style (…/sama-inquiries/status):
 *   GET /cases/api/v1/court-cases/{id}/erp-integrations/send-inheritance/status
 * The skeletons read the stored integration log (request + response are persisted
 * per the story's Outputs) — the pack never calls the ERP test environment itself.
 */

/** Exact SendInheritanceToERP_Req contract (JF-734 request mapping). */
interface SendInheritanceToErpRequest {
  _inheritanceContract: {
    osInheritanceNumber: string;
    inheritanceName: string;
    inheritorName: string;
    inheritorIDNumber: string;
    initialDecisionNumber: string;
    /** Gregorian, YYYY/MM/DD (converted from the stored Hijri date). */
    initialDecisionDate: string;
    /** Hijri, YYYY/MM/DD — separator must be '/', not the stored '-'. */
    initialDecisionHijriDate?: string;
    /** Business rule: "Courtcode and SubCourtCode is always 1 for both". */
    initialDecisionCourtCode: string;
    initialDecisionSubCourtCode: string;
    /** Structured heir records serialized into a single free-text string. */
    heirs: string;
    caseSummary: string;
    /** Business rule: leave devotion and legalConsultantNotes empty. */
    devotion?: string;
    will?: string;
    legalConsultantNotes?: string;
    appellateDecisionNumber?: string;
    appellateDecisionDate?: string;
    appellateDecisionHijriDate?: string;
    appellateDecisionCourtCode?: string;
    appellateDecisionSubCourtCode?: string;
    appellateDecisionAttachmentURL?: string;
    /** Mandatory — the request must NOT be sent when missing. */
    initialDecisionAttachmentURL: string;
    /** Mandatory — the request must NOT be sent when missing. */
    scopeOfWorkAttachmentURL: string;
    /** "6" = Certified Public Accountant, "7" = Lawyer — no other values. */
    spTypes: Array<{ spType: '6' | '7' }>;
    findings: Array<{
      /** "1" = Inside SA, "2" = Outside SA. */
      findingsLocation: '1' | '2';
      cashValue?: string;
      /** Numeric value with the "سهم" suffix stripped. */
      numberOfTradableStocks?: string;
      /** Exact ERP spelling is "Shares" — NOT the earlier "Sahares" typo. */
      numberOfNonTradableStocksAndShares?: string;
      /** "لا يوجد" mapped to 0. */
      numberOfProperties?: string;
      companiesAndInstitutions?: string;
      movables?: string;
      /** Numeric value with the "مركبة" suffix stripped; "لا يوجد" → 0. */
      vehicles?: string;
      numberOfCasesAgainstHeirs?: string;
      numberOfCasesAgainstInheritance?: string;
    }>;
    /** Mandatory when assignmentType = 1. */
    spGUID: string;
    /** Mandatory when assignmentType = 1. */
    serviceTypeGUID: string;
    /** Always "1" (Direct Assignment). */
    assignmentType: '1';
  };
}

/** Exact SendInheritanceToERP_Resp contract (JF-734 response handling). */
interface SendInheritanceToErpResponse {
  /** "200" = success (new OR already-exists); "400" = failed. */
  code: string;
  message?: string;
  /** Mandatory when code = 200 — missing means "incomplete", technical review. */
  requestID?: string;
  agreementNumber?: string;
}

/** GUESS — portal-side integration-log surface; align once JF-734 is developed. */
const ERP_SEND_INHERITANCE_STATUS = (caseId: string) =>
  `/cases/api/v1/court-cases/${caseId}/erp-integrations/send-inheritance/status`;

test.describe('JF-734 Send Approved Inheritance Details to ERP', () => {
  let session: ApiSession;
  let acceptedCaseId: string | undefined;

  test.beforeAll(async () => {
    session = await apiLogin();
    // Trigger precondition: an estate whose liquidator has ACCEPTED the assignment
    // (golden fixture INH00016 — Majed ALQAHTANI, verified round-3 2026-07-16).
    const res = await apiGet(session, ENDPOINTS.courtCases(1, 50));
    const items = (await res.json())?.data?.items ?? [];
    acceptedCaseId = items.find((i: { liquidatorName?: string }) => i.liquidatorName)?.caseId;
  });

  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test.fixme('@blocker liquidator acceptance triggers SendInheritanceToERP with the full mandatory contract', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    test.skip(!acceptedCaseId, 'no estate with an accepted liquidator');
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(acceptedCaseId!));
    expect(res.status()).toBe(200);
    const logged = (await res.json())?.data?.request as SendInheritanceToErpRequest;
    const c = logged._inheritanceContract;
    // Mandatory main data
    expect(c.osInheritanceNumber, 'osInheritanceNumber must uniquely identify the inheritance').toBeTruthy();
    expect(c.inheritanceName).toBeTruthy();
    expect(c.inheritorName).toBeTruthy();
    expect(c.inheritorIDNumber).toBeTruthy();
    expect(c.heirs, 'heirs serialized into a single string').toBeTruthy();
    expect(c.caseSummary).toBeTruthy();
    // Mandatory decision data + date formats
    expect(c.initialDecisionNumber).toBeTruthy();
    expect(c.initialDecisionDate, 'Gregorian YYYY/MM/DD').toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    if (c.initialDecisionHijriDate) {
      expect(c.initialDecisionHijriDate, "Hijri with '/' separator (e.g. 1448/02/05)").toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    }
    // Business rule: court/sub-court codes are always "1"
    expect(c.initialDecisionCourtCode).toBe('1');
    expect(c.initialDecisionSubCourtCode).toBe('1');
    // Mandatory attachments
    expect(c.initialDecisionAttachmentURL).toBeTruthy();
    expect(c.scopeOfWorkAttachmentURL).toBeTruthy();
    // Root-level assignment block
    expect(c.assignmentType).toBe('1');
    expect(c.spGUID, 'spGUID mandatory when assignmentType = 1').toBeTruthy();
    expect(c.serviceTypeGUID, 'serviceTypeGUID mandatory when assignmentType = 1').toBeTruthy();
    // spTypes and findings must be arrays; findings must have >= 1 record
    expect(Array.isArray(c.spTypes)).toBe(true);
    expect(Array.isArray(c.findings)).toBe(true);
    expect(c.findings.length, 'findings must include at least one record').toBeGreaterThan(0);
  });

  test.fixme('@high spType is derived from the accepting liquidator type — "6" CPA / "7" Lawyer only', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    test.skip(!acceptedCaseId, 'no estate with an accepted liquidator');
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(acceptedCaseId!));
    const logged = (await res.json())?.data?.request as SendInheritanceToErpRequest;
    for (const entry of logged._inheritanceContract.spTypes) {
      expect(['6', '7'], 'no other spType values apply to this flow').toContain(entry.spType);
    }
  });

  test.fixme('@high integration is NOT triggered before the liquidator accepts the assignment request', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    // Pick an estate WITHOUT an accepted liquidator and assert no ERP send was logged.
    const list = await apiGet(session, ENDPOINTS.courtCases(1, 50));
    const items = (await list.json())?.data?.items ?? [];
    const unassigned = items.find((i: { liquidatorName?: string }) => !i.liquidatorName)?.caseId;
    test.skip(!unassigned, 'no unassigned estate available');
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(unassigned));
    // Expected: no integration attempt exists for a file the liquidator has not accepted.
    expect([200, 204, 404]).toContain(res.status());
    if (res.status() === 200) {
      const data = (await res.json())?.data;
      expect(data?.request ?? null, 'no SendInheritanceToERP request may exist pre-acceptance').toBeNull();
    }
  });

  test.fixme('@high request is withheld when a mandatory attachment or GUID is missing', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    test.skip(!acceptedCaseId, 'no estate with an accepted liquidator');
    // Exceptions table: missing initialDecisionAttachmentURL, scopeOfWorkAttachmentURL,
    // spGUID or serviceTypeGUID → the system must NOT send and must store the
    // validation issue. Requires a seeded file missing one mandatory item.
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(acceptedCaseId!));
    const data = (await res.json())?.data;
    if (data?.validationIssue) {
      expect(data.request ?? null, 'request must not be sent while a mandatory field is missing').toBeNull();
      expect(String(data.validationIssue)).toBeTruthy();
    }
  });

  test.fixme('@high successful response stores requestID (and agreementNumber); 200 without requestID is incomplete', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    test.skip(!acceptedCaseId, 'no estate with an accepted liquidator');
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(acceptedCaseId!));
    const data = (await res.json())?.data;
    const erp = data?.response as SendInheritanceToErpResponse;
    if (erp?.code === '200') {
      expect(erp.requestID, 'code 200 without requestID must be flagged incomplete for technical review').toBeTruthy();
      expect(data?.erpRequestId ?? data?.requestID, 'requestID stored as the ERP request/PR reference').toBeTruthy();
      if (erp.agreementNumber) {
        expect(data?.agreementNumber, 'agreementNumber stored when returned').toBe(erp.agreementNumber);
      }
    }
  });

  test.fixme('@medium duplicate sends are prevented; ERP "already exists" 200 is treated as success', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    test.skip(!acceptedCaseId, 'no estate with an accepted liquidator');
    // Business rule: never send the same inheritance twice after a successful response.
    // ERP returns code 200 with "OSInheritanceNumber: <n> already exists in ERP." for
    // repeats — that response must still be handled as success, not a new attempt.
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(acceptedCaseId!));
    const attempts: Array<{ status?: string }> = (await res.json())?.data?.attempts ?? [];
    const successes = attempts.filter((a) => a.status === 'Success');
    expect(successes.length, 'at most one successful SendInheritanceToERP per file').toBeLessThanOrEqual(1);
  });

  test.fixme('@medium findings are normalized — "لا يوجد"→0, suffixes stripped, exact "Shares" field spelling', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    test.skip(!acceptedCaseId, 'no estate with an accepted liquidator');
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(acceptedCaseId!));
    const logged = (await res.json())?.data?.request as SendInheritanceToErpRequest;
    for (const f of logged._inheritanceContract.findings) {
      expect(['1', '2']).toContain(f.findingsLocation);
      // JF-707/734 grooming resolved the earlier "Sahares" contract typo — the key
      // must be numberOfNonTradableStocksAndShares and must never carry "لا يوجد".
      expect(f).not.toHaveProperty('numberOfNonTradableStocksAndSahares');
      for (const v of [f.numberOfTradableStocks, f.vehicles, f.numberOfProperties, f.movables]) {
        if (v === undefined) continue;
        expect(v, 'suffixes ("سهم"/"مركبة") stripped and "لا يوجد" mapped to 0').not.toMatch(/سهم|مركبة|لا يوجد/);
      }
    }
  });

  test.fixme('@medium ERP code 400 marks the attempt failed and business-validation errors are not retried', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-734' });
    test.skip(!acceptedCaseId, 'no estate with an accepted liquidator');
    // Retry policy: technical failures retry after 5 then 15 minutes; ERP business
    // validation (code 400) must NOT be retried and the ERP message must be stored.
    const res = await apiGet(session, ERP_SEND_INHERITANCE_STATUS(acceptedCaseId!));
    const data = (await res.json())?.data;
    const erp = data?.response as SendInheritanceToErpResponse;
    if (erp?.code === '400') {
      expect(data?.status).toBe('Failed');
      expect(data?.errorMessage, 'returned ERP failure message stored in the integration log').toBeTruthy();
      const attempts: Array<{ reason?: string }> = data?.attempts ?? [];
      expect(attempts.length, 'no automatic retry after a business-validation failure').toBe(1);
    }
  });
});
