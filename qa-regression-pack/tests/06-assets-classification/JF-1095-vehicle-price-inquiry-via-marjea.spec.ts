import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ENDPOINTS, ApiSession } from '../../src/helpers/api';
import { annotateKnownIssue } from '../../src/known-issues';

/**
 * JF-1095 — Vehicle Price Inquiry via Marjea on Asset Addition (مركبات → تحقق).
 *
 * Status: Backlog — the Add-Asset تحقق flow (Marjea user-vehicles by any national ID)
 * is NOT developed; those acceptance criteria are test.fixme skeletons. The
 * case-level Marjea inquiry surface DOES exist on CIT (…/marjea-inquiry, verified
 * 2026-07-19) and runs LIVE here — including a guard for the open bug
 * JF-1101 "Marjea inquiry returns 0 vehicles", annotated so its failure is
 * reported KNOWN (and a pass surfaces "possibly fixed").
 *
 * Outbound (story-documented, Marjea/ELM side — NOT called by this spec; app-id /
 * app-key live in .env-class secrets and must never appear in specs or logs):
 *   POST https://priceindex.api.elm.sa/marjea/api/v1/rabet/appraisal/user-vehicles
 */

/** Verified shape of GET …/marjea-inquiry data (CIT 2026-07-19). */
interface MarjeaInquiryStatus {
  courtCaseId: string;
  marjeaInquiryRecordId: string;
  status: number;
  isReInquiryAllowed: boolean;
  returnedVehicleCount: number;
  succeededAt?: string | null;
  lastAttemptAt?: string | null;
}

/** Exact Marjea vehicle contract (JF-1095 successful response item). */
interface MarjeaVehicle {
  sequenceNumber: number;
  make: string;
  model: string;
  year: number;
  price: number;
}

/** Exact Marjea 404 error contract (no vehicles for this user). */
interface MarjeaErrorResponse {
  errors: unknown;
  message: { ar: string; en: string };
  status: number;
  timestamp: string;
  traceId: string;
}

test.describe('JF-1095 Vehicle Price Inquiry via Marjea on Asset Addition', () => {
  let session: ApiSession;
  /** case → marjea status, resolved once in beforeAll (read-only GETs) */
  const statuses: MarjeaInquiryStatus[] = [];

  test.beforeAll(async () => {
    session = await apiLogin();
    const list = await apiGet(session, ENDPOINTS.courtCases(1, 20));
    const cases: Array<{ caseId: string }> = (await list.json())?.data?.items ?? [];
    for (const c of cases) {
      const res = await apiGet(session, ENDPOINTS.marjeaInquiry(c.caseId));
      if (!res.ok()) continue;
      const data = (await res.json())?.data as MarjeaInquiryStatus | null;
      if (data?.marjeaInquiryRecordId) statuses.push(data);
    }
  });

  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // ---------------------------------------------------------------- LIVE ----

  test('@high marjea-inquiry surface responds with the inquiry status contract', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1095' });
    expect(statuses.length, 'seeded estates should carry Marjea inquiry records').toBeGreaterThan(0);
    for (const s of statuses) {
      expect(s.marjeaInquiryRecordId).toBeTruthy();
      expect(typeof s.status).toBe('number');
      expect(typeof s.isReInquiryAllowed, 'retry affordance exposed (AC: allow retry)').toBe('boolean');
      expect(typeof s.returnedVehicleCount, 'vehicle count is reported per inquiry').toBe('number');
      expect(s.returnedVehicleCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('@medium Marjea returns vehicles for at least one seeded deceased (guards JF-1101)', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1095' });
    // JF-1095's whole flow depends on Marjea actually returning the vehicle list.
    // JF-1101: every CIT inquiry currently reports returnedVehicleCount = 0 even for
    // deceased NIDs with seeded vehicle data. Fails as KNOWN while the bug is open;
    // a pass means it may be fixed (reporter flags "possibly fixed — verify & remove").
    annotateKnownIssue(test, 'JF-1101');
    test.skip(!statuses.length, 'no Marjea inquiry records found');
    const counts = statuses.map((s) => s.returnedVehicleCount);
    expect(
      counts.some((c) => c > 0),
      `no inquiry returned any vehicle (counts: ${JSON.stringify(counts)})`,
    ).toBeTruthy();
  });

  // --------------------------------------------------------------- FIXME ----

  test.fixme('@blocker تحقق sends the Marjea user-vehicles request with idNumber and the auth/idempotency headers', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1095' });
    // Once the integration log exists, assert the stored request: body { idNumber }
    // (any person's NID — not restricted to the deceased) plus headers app-id,
    // app-key, X-Operator-Id (requesting user's NID) and a UUID X-Request-Id
    // regenerated per inquiry attempt to prevent duplicate processing.
    const loggedHeaders: Record<string, string> = {}; // ← integration-log surface TBD
    const loggedBody: { idNumber: string } = { idNumber: '1012345678' };
    expect(loggedBody.idNumber).toMatch(/^\d{10}$/);
    for (const h of ['app-id', 'app-key', 'X-Operator-Id']) {
      expect(loggedHeaders[h], `mandatory Marjea header "${h}"`).toBeTruthy();
    }
    expect(loggedHeaders['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test.fixme('@high all returned vehicles are displayed and selecting one pre-fills the form read-only', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1095' });
    // Display columns: الشركة المصنعة (make), الموديل (model), سنة الصنع (year),
    // القيمة التقديرية (price), الرقم التسلسلي (sequenceNumber). ALL records are
    // listed — not just the first — and nothing is pre-filled until one is selected.
    const returned: MarjeaVehicle[] = []; // ← Marjea response once flow exists
    await page.goto('/'); // → Add Asset screen, asset type مركبات (route TBD)
    await page.getByRole('textbox', { name: 'رقم الهوية' }).fill('1012345678');
    await page.getByRole('button', { name: 'تحقق' }).click();
    for (const v of returned) {
      await expect(page.getByRole('row', { name: new RegExp(`${v.make}.*${v.model}`) })).toBeVisible();
    }
    await page.getByRole('row', { name: /Toyota.*Camry/ }).click();
    const model = page.getByRole('textbox', { name: 'الموديل' });
    await expect(model).toHaveValue('Camry');
    await expect(model, 'selected-vehicle fields must be read-only').toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'القيمة التقديرية للمركبة' })).toHaveValue(/45000/);
  });

  test.fixme('@high the FULL Marjea response array is stored against the asset record — not only the selected vehicle', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1095' });
    // Business rule: store the complete returned array + full request/response in
    // the integration log with timestamp, Liquidator ID, Inheritance File ID and
    // the national ID used.
    const assetId = ''; // resolve a saved vehicle asset once the feature exists
    const res = await apiGet(session, `/cases/api/v1/assets/${assetId}`); // GUESS
    const stored = (await res.json())?.data?.marjeaVehicles as MarjeaVehicle[];
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length, 'all returned vehicles persisted, not just the selection').toBeGreaterThanOrEqual(1);
    for (const v of stored) {
      expect(typeof v.sequenceNumber).toBe('number');
      expect(v.make).toBeTruthy();
      expect(typeof v.price).toBe('number');
    }
  });

  test.fixme('@medium Marjea 404 shows the Arabic no-vehicles message and no list; 400/401/500 per error table', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1095' });
    // 404 contract: message.ar = "لا توجد مركبات مرتبطة بهوية المستخدم." → display it,
    // allow a different NID. 400 invalid NID → validation error. 401 → generic error,
    // flag credentials for technical review. 500 → generic error, allow retry.
    const notFound: MarjeaErrorResponse | undefined = undefined; // ← log surface TBD
    void notFound;
    await page.goto('/'); // → Add Asset screen, asset type مركبات
    await page.getByRole('textbox', { name: 'رقم الهوية' }).fill('1000000000');
    await page.getByRole('button', { name: 'تحقق' }).click();
    await expect(page.getByText('لا توجد مركبات مرتبطة بهوية المستخدم.')).toBeVisible();
    await expect(page.getByRole('row'), 'no vehicle list on 404').toHaveCount(0);
  });

  test.fixme('@medium changing رقم الهوية after retrieval clears the list; submission requires تحقق + a selected vehicle', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1095' });
    await page.goto('/'); // → Add Asset screen, مركبات, after a successful تحقق + selection
    const nid = page.getByRole('textbox', { name: 'رقم الهوية' });
    await expect(page.getByRole('button', { name: 'تحقق' }), 'disabled until رقم الهوية filled').toBeDisabled();
    await nid.fill('1099999999');
    // AC: editing the NID clears the vehicle list and every pre-filled field, and
    // إرسال stays blocked until a new تحقق succeeds and a vehicle is selected.
    await expect(page.getByRole('textbox', { name: 'الموديل' })).toHaveValue('');
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeDisabled();
  });
});
