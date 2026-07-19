import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';

/**
 * JF-707 — Post Newly Added Inheritance Accounting Journal to ERP (SendInhJournalToERP).
 *
 * Status: Backlog — NOT developed on CIT (depends on JF-721, the Add Accounting
 * Journal page, also undeveloped). All scenarios are test.fixme skeletons from the
 * story's confirmed contract; field names/casing are quoted verbatim
 * (voucherList, erpJournalNumber, erpJournalPostingDate, erpVoucherId).
 *
 * Outbound (story-documented, ERP side — NOT called by this spec):
 *   POST https://apitest.infath.gov.sa/erp/inheritance/v1/SendInhJournalToERP
 * Portal-side surfaces are GUESSES pending development (journal + integration log):
 *   GET /cases/api/v1/court-cases/{id}/accounting-journals
 *   GET /cases/api/v1/accounting-journals/{journalId}/erp-posting
 * Domain rule (batch-3 ERP analysis): journals are balanced debit = credit and
 * posting uses transactionType "1" = Debit / "2" = Credit.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Exact _inhJournalContract request (JF-707 journal header + voucher lines). */
interface InhJournalContract {
  _inhJournalContract: {
    /** Header-level UUID — generated once, stored, reused on technical retries. */
    requestId: string;
    inheritanceNumber: string;
    /** Always sent as "1" (valid values pending verification). */
    journalName: string;
    journalDescription: string;
    /** Code such as "1" (valid values pending verification). */
    currency: string;
    /** Authenticated user's full name — never entered or overridden manually. */
    createdBy: string;
    /** Must contain at least one voucher line. */
    voucherList: Array<{
      /** Line-level UUID — unique per voucher line, reused on retries. */
      requestId: string;
      /** Format: YYYY-MM-DD. */
      transactionDate: string;
      /** Configured ERP main-account code. */
      mainAccount: string;
      description: string;
      /** Sent as a string, e.g. "15000". */
      transactionAmount: string;
      /** "1" = Debit, "2" = Credit. */
      transactionType: '1' | '2';
    }>;
  };
}

/** Exact SendInhJournalToERP response (confirmed Postman example). */
interface InhJournalErpResponse {
  code: string;
  message?: string;
  erpJournalNumber?: string;
  erpJournalPostingDate?: string;
  voucherList?: Array<{ requestId: string; erpVoucherId: string }>;
}

/** GUESSED portal-side surfaces; align once JF-707/JF-721 are developed. */
const JOURNALS = (caseId: string) => `/cases/api/v1/court-cases/${caseId}/accounting-journals`;
const ERP_POSTING = (journalId: string) => `/cases/api/v1/accounting-journals/${journalId}/erp-posting`;

test.describe('JF-707 Post Inheritance Accounting Journal to ERP', () => {
  let session: ApiSession;
  let journalId = ''; // resolved from the first estate's journal list once the feature exists

  test.beforeAll(async () => {
    session = await apiLogin();
    const list = await apiGet(session, ENDPOINTS.courtCases(1, 10));
    const caseId: string | undefined = ((await list.json())?.data?.items ?? [])[0]?.caseId;
    if (caseId) {
      const journals = await apiGet(session, JOURNALS(caseId));
      if (journals.ok()) journalId = ((await journals.json())?.data?.items ?? [])[0]?.journalId ?? '';
    }
  });

  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test.fixme('@blocker successful journal creation triggers SendInhJournalToERP with the confirmed header contract', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-707' });
    const res = await apiGet(session, ERP_POSTING(journalId));
    const logged = (await res.json())?.data?.request as InhJournalContract;
    const j = logged._inhJournalContract;
    expect(j.requestId, 'header requestId is a system-generated UUID').toMatch(UUID_RE);
    expect(j.inheritanceNumber).toBeTruthy();
    expect(j.journalName, 'always sent as "1"').toBe('1');
    expect(j.journalDescription).toBeTruthy();
    expect(j.currency).toBeTruthy();
    expect(j.createdBy, "authenticated creator's full name, not user-editable").toBeTruthy();
    expect(Array.isArray(j.voucherList)).toBe(true);
    expect(j.voucherList.length, 'at least one voucher line').toBeGreaterThan(0);
  });

  test.fixme('@high voucher lines carry UUID requestIds, YYYY-MM-DD dates, string amounts and balanced debit=credit', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-707' });
    const res = await apiGet(session, ERP_POSTING(journalId));
    const logged = (await res.json())?.data?.request as InhJournalContract;
    const lines = logged._inhJournalContract.voucherList;
    const seen = new Set<string>();
    let debit = 0;
    let credit = 0;
    for (const line of lines) {
      expect(line.requestId).toMatch(UUID_RE);
      expect(seen.has(line.requestId), 'line-level requestId unique per voucher').toBe(false);
      seen.add(line.requestId);
      expect(line.transactionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(line.mainAccount, 'configured ERP main-account code').toBeTruthy();
      expect(typeof line.transactionAmount, 'transactionAmount sent as a string').toBe('string');
      expect(['1', '2'], '"1" = Debit, "2" = Credit only').toContain(line.transactionType);
      if (line.transactionType === '1') debit += Number(line.transactionAmount);
      else credit += Number(line.transactionAmount);
    }
    expect(debit, 'journal must balance: total debit = total credit').toBeCloseTo(credit, 2);
  });

  test.fixme('@high success stores erpJournalNumber, erpJournalPostingDate and per-line erpVoucherId matched by requestId', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-707' });
    const res = await apiGet(session, ERP_POSTING(journalId));
    const data = (await res.json())?.data;
    const request = data?.request as InhJournalContract;
    const response = data?.response as InhJournalErpResponse;
    expect(response.code).toBe('200');
    expect(response.erpJournalNumber, 'success without erpJournalNumber = incomplete, technical review').toBeTruthy();
    expect(data?.status).toBe('Posted in ERP');
    expect(data?.erpJournalNumber).toBe(response.erpJournalNumber);
    expect(data?.erpJournalPostingDate).toBe(response.erpJournalPostingDate);
    const sentIds = new Set(request._inhJournalContract.voucherList.map((v) => v.requestId));
    for (const v of response.voucherList ?? []) {
      expect(sentIds.has(v.requestId), 'returned voucher matched to a sent line via requestId').toBe(true);
      expect(v.erpVoucherId, 'erpVoucherId saved against the matched local voucher line').toBeTruthy();
    }
  });

  test.fixme('@high "already exists … and posted" duplicate response is an idempotent success reusing the same requestId', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-707' });
    // ERP recognizes an already-created journal by the header requestId. Retries must
    // reuse the same header/line requestIds — never regenerate on timeout — and the
    // duplicate 200 (valid erpJournalNumber) must set status to Posted in ERP.
    const res = await apiGet(session, ERP_POSTING(journalId));
    const data = (await res.json())?.data;
    const attempts: Array<{ request: InhJournalContract }> = data?.attempts ?? [];
    const headerIds = new Set(attempts.map((a) => a.request._inhJournalContract.requestId));
    expect(headerIds.size, 'all attempts reuse one header requestId').toBeLessThanOrEqual(1);
    const response = data?.response as InhJournalErpResponse;
    if (response?.message?.includes('already exists')) {
      expect(response.code).toBe('200');
      expect(response.erpJournalNumber).toBeTruthy();
      expect(data?.status, 'duplicate confirmed-posted handled as success').toBe('Posted in ERP');
    }
  });

  test.fixme('@medium HTTP 200 with a non-success body code is NOT treated as posted', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-707' });
    // The system must evaluate BOTH the HTTP status and the response-body "code" —
    // an HTTP 200 whose body code indicates failure must mark the posting failed.
    const res = await apiGet(session, ERP_POSTING(journalId));
    const data = (await res.json())?.data;
    const response = data?.response as InhJournalErpResponse;
    if (response && response.code !== '200') {
      expect(data?.status).not.toBe('Posted in ERP');
    }
  });

  test.fixme('@medium local validation failures block the ERP call and set ERP Posting Failed without auto-retry', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-707' });
    // Exceptions: missing main-account mapping, missing inheritance number, or an
    // empty voucherList → do NOT send, status = ERP Posting Failed, log the reason.
    // The local journal itself remains stored regardless of ERP outcome. Automatic
    // retries (5 min, then 15 min) apply ONLY to technical failures.
    const res = await apiGet(session, ERP_POSTING(journalId));
    const data = (await res.json())?.data;
    if (data?.validationIssue) {
      expect(data.request ?? null, 'no ERP request sent on local validation failure').toBeNull();
      expect(data.status).toBe('ERP Posting Failed');
      const attempts: Array<unknown> = data?.attempts ?? [];
      expect(attempts.length, 'business-validation failures are not auto-retried').toBeLessThanOrEqual(1);
    }
  });
});
