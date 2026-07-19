import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';

/**
 * JF-1084 — طلب التصعيد (مدير التركة): Estate Manager reviews correspondences the
 * liquidator escalated (محولة للمركز), adds mandatory feedback (+ optional
 * attachments) and returns them to the liquidator (status → قيد التنفيذ).
 * Sprint-13, story status: Backlog — NOT developed yet.
 *
 * CIT probe 2026-07-19 (read-only):
 *   - Liquidator-side escalation substrate EXISTS: the correspondence wizard detail
 *     carries `canEscalate` + `escalation`, and …/{corrId}/escalation answers 405 to
 *     GET (a write route is registered) — the محولة للمركز state is producible.
 *   - The EM side does NOT exist yet: GET …/court-cases/{id}/external-correspondences
 *     with an EstateManager token -> 403 (liquidator-scoped). JF-1084 is precisely the
 *     story that opens this surface to the EM (BR-001), so the 403 is expected to flip.
 *
 * Golden fixture: INH00016 (assigned estate with a full correspondence history).
 * Read-only — no escalation is created, nothing is returned/mutated.
 */
const GOLDEN_CASE_ID = 'fb8f44cf-91e5-4e3c-a897-014d6df9ce6a'; // INH00016
const ESCALATED_LABEL = 'محولة للمركز';

test.describe('JF-1084 escalated correspondence review (Estate Manager)', () => {
  let session: ApiSession;

  test.beforeAll(async () => {
    session = await apiLogin(); // EstateManager
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // ── Live today: the supervision substrate BR-001 builds on ─────────────────

  test('@high BR-001 substrate: EM reads the estates under supervision with their liquidator', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // The review flow starts from "estates assigned to the EM" — the estates list
    // must keep exposing the estate-manager + liquidator pairing the story keys on.
    const res = await apiGet(session, '/cases/api/v1/court-cases?pageIndex=1&pageSize=50');
    expect(res.status()).toBe(200);
    const items = (await res.json())?.data?.items ?? [];
    const golden = items.find((i: { fileNumber?: string }) => i.fileNumber === 'INH00016');
    test.skip(!golden, 'INH00016 not present (environment reseeded)');
    expect(golden.estateManagerName, 'estate carries its supervising estate manager').toBeTruthy();
    expect(golden.liquidatorName, 'estate carries its assigned liquidator (source of escalations)').toBeTruthy();

    const det = await apiGet(session, `/cases/api/v1/court-cases/${GOLDEN_CASE_ID}`);
    expect(det.status()).toBe(200);
    const detail = (await det.json())?.data;
    expect(detail?.liquidatorId).toBeTruthy();
    expect(detail?.liquidatorAcceptedAt).toBeTruthy();
  });

  // ── Feature not built yet (probe 2026-07-19: EM -> 403 on the roster) ──────

  test.fixme('@high BR-001: EM can open الجهات الخارجية for a supervised estate (both access points)', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // Access points: side menu الجهات الخارجية AND التركات → الجهات الخارجية.
    // API-wise the story must flip today's 403:
    //   GET /cases/api/v1/court-cases/{id}/external-correspondences (EM token) -> 200.
    const res = await apiGet(session, `/cases/api/v1/court-cases/${GOLDEN_CASE_ID}/external-correspondences`);
    expect(res.status(), 'JF-1084 grants the EM read access to supervised correspondences').toBe(200);
    // UI (internal storageState): estates list → INH00016 → الجهات الخارجية tab.
    await page.goto('/estates');
    await page.getByText('INH00016').click();
    await expect(page.getByRole('tab', { name: 'الجهات الخارجية' })).toBeVisible();
  });

  test.fixme('@high BR-002: escalated correspondences sort to the top flagged محولة للمركز', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // List ordering: escalated first, each carrying the محولة للمركز status chip.
    await page.goto('/estates');
    await page.getByText('INH00016').click();
    await page.getByRole('tab', { name: 'الجهات الخارجية' }).click();
    const firstCard = page.locator('[class*="card"]').first(); // TODO: getByTestId once built
    await expect(firstCard.getByText(ESCALATED_LABEL)).toBeVisible();
  });

  test.fixme('@high BR-004: review page shows the liquidator progress summary + EM response section', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // Opening عرض on an escalated card reuses the liquidator's correspondence layout
    // and adds the Liquidator Progress Summary:
    //   official letter (view/download), proof of submission, reminders count/history/
    //   last-reminder date, liquidator attachments, entity response, خطاب الاستكمال,
    //   تقييم الإفادة — plus, at the bottom, the Estate Manager Response section:
    //   feedback textarea (mandatory), optional attachments, return button.
    await page.getByRole('button', { name: 'عرض' }).first().click();
    await expect(page.getByText('الخطاب الرسمي')).toBeVisible();
    await expect(page.getByText('عدد التذكيرات')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /التوجيهات|الملاحظات/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /إعادة المخاطبة للمصفي/ })).toBeVisible();
  });

  test.fixme('@high BR-005: return is blocked until the mandatory feedback is filled', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // Feedback/instructions field empty => the return action must not go through
    // (disabled button or validation error; exact UX per Figma 9332-158968).
    const returnBtn = page.getByRole('button', { name: /إعادة المخاطبة للمصفي/ });
    await expect(returnBtn).toBeDisabled();
  });

  test.fixme('@high BR-006: returning flips محولة للمركز to قيد التنفيذ and notifies the liquidator', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // Fill feedback → (optionally attach) → return:
    //   status محولة للمركز → قيد التنفيذ, liquidator notified, feedback + attachments
    //   visible to the liquidator. Expected API (contract TBD): POST
    //   …/external-correspondences/{corrId}/return { feedback, attachments[] }.
    await page.getByRole('textbox', { name: /التوجيهات|الملاحظات/ }).fill('يرجى إرسال تذكير للجهة ومتابعة الرد');
    await page.getByRole('button', { name: /إعادة المخاطبة للمصفي/ }).click();
    await expect(page.getByText('قيد التنفيذ').first()).toBeVisible();
  });

  test.fixme('@medium BR-008: the EM feedback shows as a banner on the liquidator stage with attachment actions', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // Liquidator side (liquidator session): the returned correspondence's current
    // stage renders an information banner with the EM feedback; each EM attachment
    // gets عرض + تحميل actions.
    await expect(page.getByText('يرجى إرسال تذكير للجهة ومتابعة الرد')).toBeVisible();
  });

  test.fixme('@medium BR-009: escalation history (feedback, attachments, return date) persists in the audit trail', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-1084' });
    // Complete escalation round-trip must remain queryable — estate events /
    // correspondence history should record escalation + return with metadata.
    const res = await apiGet(session, `/cases/api/v1/court-cases/${GOLDEN_CASE_ID}/events?pageIndex=1&pageSize=50`);
    expect(res.status()).toBe(200);
  });
});
