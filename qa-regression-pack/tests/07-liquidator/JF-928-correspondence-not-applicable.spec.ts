import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';
import { captureLiquidatorApiAuth, LiquidatorApiAuth } from '../../src/helpers/login';
import { URLS } from '../../src/helpers/users';

/**
 * JF-928 — تحديد الجهة الخارجية كغير منطبقة (mark external correspondence entity
 * Not-Applicable). Sprint-13, story status: Backlog — NOT developed yet.
 *
 * Actor: Liquidator. From المخاطبات الخارجية, the ⋮ menu on an entity card gains a
 * "عدم الانطباق" action that opens a confirm dialog with a MANDATORY reason, flips
 * the entity status to غير منطبقة, disables all processing actions (only عرض stays),
 * and stores the reason in the audit history. The action is only offered while the
 * correspondence is NOT مكتملة (BR-006/BR-007).
 *
 * CIT probe 2026-07-19 (read-only, liquidator session on golden estate INH00016):
 *   GET  …/court-cases/{id}/external-correspondences            -> 200 (roster; status/statusLabel per entity)
 *   GET  …/external-correspondences/{corrId}                    -> 200 (wizard detail; canAct/canEscalate…)
 *   GET  …/external-correspondences/{corrId}/not-applicable      -> 404 — feature NOT built yet
 *   No "غير منطبقة" status appears anywhere in the roster/detail payloads yet.
 * Golden fixture: INH00016 correspondence MK-16-1 (entity "AreaF QA Bank 058160"),
 * completed end-to-end in round-3 — the exact state where عدم الانطباق must be hidden.
 *
 * Liquidator API calls need `Authorization` + `x-facility-id` (no TenantIdentifier) —
 * see captureLiquidatorApiAuth. Read-only: nothing on INH00016 is mutated.
 */
const GOLDEN_CASE_ID = 'fb8f44cf-91e5-4e3c-a897-014d6df9ce6a'; // INH00016
const SKIP_NO_LIQ = 'liquidator API auth unavailable (Nafath mock login/facility entry failed)';

interface CorrespondenceRosterItem {
  correspondenceEntityId: string;
  correspondenceId: string;
  nameAr: string;
  status: string;
  statusLabel: string;
}

test.describe('JF-928 mark external correspondence entity Not-Applicable', () => {
  let liq: LiquidatorApiAuth | null = null;
  let api: APIRequestContext;
  let roster: CorrespondenceRosterItem[] = [];

  const liqGet = (p: string) =>
    api.get(`${URLS.api}${p}`, {
      headers: {
        Authorization: `Bearer ${liq!.token}`,
        'x-facility-id': liq!.facilityId,
        'Accept-Language': 'ar-SA',
        'Content-Type': 'application/json',
      },
    });

  test.beforeAll(async () => {
    api = await pwRequest.newContext({ ignoreHTTPSErrors: true });
    liq = await captureLiquidatorApiAuth();
    if (!liq) return;
    const res = await liqGet(`/cases/api/v1/court-cases/${GOLDEN_CASE_ID}/external-correspondences`);
    if (res.ok()) roster = ((await res.json())?.data?.items ?? []) as CorrespondenceRosterItem[];
  });

  test.afterAll(async () => {
    await api?.dispose();
  });

  // ── Live today: the surface JF-928 extends ─────────────────────────────────

  test('@high correspondence roster exposes a status per entity card (surface for غير منطبقة)', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    test.skip(!liq, SKIP_NO_LIQ);
    // The not-applicable flow hangs off the roster's entity cards — every card must
    // carry the status pair the new "غير منطبقة" value will join.
    expect(roster.length, 'golden estate should expose at least one correspondence entity').toBeGreaterThan(0);
    for (const item of roster) {
      expect(item.status, `${item.nameAr}: status`).toBeTruthy();
      expect(item.statusLabel, `${item.nameAr}: statusLabel`).toBeTruthy();
      expect(item.correspondenceEntityId).toBeTruthy();
    }
  });

  test('@high BR-007 baseline: the golden completed correspondence reports مكتملة', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    test.skip(!liq, SKIP_NO_LIQ);
    // BR-007: a مكتملة correspondence must never offer عدم الانطباق. Guard the state
    // itself — the round-3 completed fixture must keep reporting Completed/مكتملة.
    const completed = roster.find((i) => i.status === 'Completed');
    test.skip(!completed, 'no completed correspondence on the golden estate (environment reseeded)');
    expect(completed!.statusLabel).toBe('مكتملة');
    const det = await liqGet(
      `/cases/api/v1/court-cases/${GOLDEN_CASE_ID}/external-correspondences/${completed!.correspondenceId}`,
    );
    expect(det.status()).toBe(200);
    const detail = (await det.json())?.data;
    expect(detail?.status).toBe('Completed');
  });

  // ── Feature not built yet (probe 2026-07-19: not-applicable route -> 404) ──

  test.fixme('@high main flow: عدم الانطباق marks the entity غير منطبقة with a saved reason', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    // Nav (liquidator storageState): /service-providers/companies → الدخول على المنشأة
    //   → court-cases → INH00016 → المخاطبات الخارجية → entity card (non-completed) → ⋮.
    await page.goto('/service-providers/court-cases');
    await page.getByText('INH00016').click();
    await page.getByRole('tab', { name: 'المخاطبات الخارجية' }).click();
    // ⋮ on a non-completed entity card → "عدم الانطباق"
    await page.getByRole('button', { name: 'المزيد' }).first().click(); // ⋮ (three-dot)
    await page.getByRole('menuitem', { name: 'عدم الانطباق' }).click();
    // Confirmation dialog: mandatory reason textarea + confirm + cancel
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('textbox')).toBeVisible(); // سبب عدم الانطباق
    await dialog.getByRole('textbox').fill('لا يوجد تعامل للمتوفى مع هذه الجهة');
    await dialog.getByRole('button', { name: 'تأكيد عدم الانطباق' }).click();
    // Expected API (contract TBD — probe 2026-07-19: …/{corrId}/not-applicable -> 404):
    //   POST /cases/api/v1/court-cases/{id}/external-correspondences/{corrId}/not-applicable { reason }
    // Toast + card status flip (BR-002)
    await expect(page.getByText('تم تحديث حالة الجهة إلى "غير منطبقة"')).toBeVisible();
    await expect(page.getByText('غير منطبقة').first()).toBeVisible();
  });

  test.fixme('@high AF-002: confirming without a reason is blocked with a field validation', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    // BR-001: reason is mandatory. Empty reason + تأكيد عدم الانطباق =>
    //   validation message "سبب عدم الانطباق مطلوب." + field highlighted,
    //   status NOT updated, dialog stays open.
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'تأكيد عدم الانطباق' }).click();
    await expect(dialog.getByText('سبب عدم الانطباق مطلوب.')).toBeVisible();
    await expect(dialog).toBeVisible(); // remains open until valid reason or إلغاء
  });

  test.fixme('@medium AF-001: إلغاء closes the dialog without saving', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    // Cancel => dialog closes, no status change, user returned to الجهات الخارجية list.
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill('سبب سيتم التخلي عنه');
    await dialog.getByRole('button', { name: 'الغاء' }).click();
    await expect(dialog).toBeHidden();
    // Roster card keeps its previous status (no غير منطبقة, no API write fired).
  });

  test.fixme('@high BR-003/BR-004: a غير منطبقة entity offers only the عرض action', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    // After marking: all processing actions disabled/hidden on the entity card;
    // only عرض remains available.
    await page.getByRole('button', { name: 'المزيد' }).first().click();
    await expect(page.getByRole('menuitem', { name: 'عرض' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'بدء المعالجة' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'عدم الانطباق' })).toHaveCount(0);
  });

  test.fixme('@medium عرض on a غير منطبقة entity shows name, status and the saved reason', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    // View flow: entity name + status غير منطبقة + Reason for Not Applicable.
    await page.getByRole('menuitem', { name: 'عرض' }).click();
    await expect(page.getByText('غير منطبقة')).toBeVisible();
    await expect(page.getByText('لا يوجد تعامل للمتوفى مع هذه الجهة')).toBeVisible();
  });

  test.fixme('@medium BR-005: the not-applicable reason lands in the audit history', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    // The reason must be persisted to the system audit/history. Estate activity log:
    //   GET /cases/api/v1/court-cases/{id}/events → expect a correspondence
    //   not-applicable event (name TBD) with the entered reason in its metadata.
    const res = await liqGet(`/cases/api/v1/court-cases/${GOLDEN_CASE_ID}/events?pageIndex=1&pageSize=50`);
    expect(res.status()).toBe(200);
  });

  test.fixme('@high BR-006/BR-007: عدم الانطباق offered for every non-completed status, hidden for مكتملة', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-928' });
    // Available while status ∈ {لم تبدأ، قيد التنفيذ، بانتظار رد الجهة، محولة للمركز};
    // NOT displayed when the correspondence is مكتملة. Golden estate has a مكتملة
    // fixture (MK-16-1) — its ⋮ menu must not list عدم الانطباق.
    await page.getByRole('button', { name: 'المزيد' }).first().click(); // ⋮ of the مكتملة card
    await expect(page.getByRole('menuitem', { name: 'عدم الانطباق' })).toHaveCount(0);
  });
});
