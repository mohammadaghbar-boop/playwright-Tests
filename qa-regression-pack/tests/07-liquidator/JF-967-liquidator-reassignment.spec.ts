import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';

/**
 * JF-967 — إعادة تعيين المصفي / Liquidator Reassignment.
 * Sprint-13, story status: Backlog — NOT developed yet.
 *
 * Actor: Inheritance (Estate) Manager. From the estate header ⋮ menu, a two-step
 * dialog (mandatory reason → assignment method يدوي/آلي) sends a reassignment
 * request to a new liquidator. The current liquidator keeps access until the new
 * one accepts; pending requests are auto-withdrawn on re-run; everything is logged
 * in the estate activity log; the request carries a backend reassignment flag that
 * gates the JF-968 flow-map trigger.
 *
 * CIT probe 2026-07-19 (read-only):
 *   - No reassignment API exists yet: GET …/{id}/assignment | /reassignment |
 *     /assignment/eligible-liquidators all -> 404. Only the round-3 accept/reject
 *     routes exist (POST …/assignment/accept | /assignment/reject).
 *   - The substrate is healthy: golden estate INH00016 still carries its accepted
 *     liquidator (liquidatorId + liquidatorAcceptedAt) and its activity log keeps
 *     events 23 (إرسال طلب تعيين للمصفي) and 24 (قبول المصفي لطلب الإسناد) — the
 *     same event stream + assignment pipeline reassignment plugs into.
 *
 * Read-only. DO NOT reassign the real liquidator on INH00016 — it is the golden
 * assigned fixture for the whole liquidator surface.
 */
const GOLDEN_CASE_ID = 'fb8f44cf-91e5-4e3c-a897-014d6df9ce6a'; // INH00016
const REASSIGN_ACTION = 'إعادة تعيين المصفي';
const SUCCESS_TOAST = 'تم إرسال طلب التعيين بنجاح.';
const NO_ELIGIBLE_MSG = 'لا يوجد مصفٍ مؤهل متاح وفق معايير التعيين التلقائي.';

interface EstateEvent {
  eventType: number;
  eventNameAr: string;
  doneBy: string;
  occurredAt: string;
}

test.describe('JF-967 liquidator reassignment', () => {
  let session: ApiSession;

  test.beforeAll(async () => {
    session = await apiLogin(); // EstateManager (the reassignment actor's role)
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // ── Live today: the preconditions & substrate reassignment builds on ───────

  test('@high precondition: the golden estate keeps an ACTIVE accepted liquidator', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // Reassignment requires "an active assigned liquidator" (precondition #2) and
    // updates تاريخ الإسناد on acceptance — both fields must stay exposed.
    const res = await apiGet(session, `/cases/api/v1/court-cases/${GOLDEN_CASE_ID}`);
    test.skip(res.status() === 404, 'INH00016 not present (environment reseeded)');
    expect(res.status()).toBe(200);
    const estate = (await res.json())?.data;
    expect(estate?.liquidatorId, 'assigned liquidator id').toBeTruthy();
    expect(estate?.liquidatorName, 'assigned liquidator name').toBeTruthy();
    expect(estate?.liquidatorAcceptedAt, 'assignment (acceptance) date — the field reassignment updates').toBeTruthy();
  });

  test('@high substrate: the activity log still carries the assignment events (23/24)', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // The reassignment flow re-uses this pipeline: it re-emits an assignment request
    // (event 23) and completes on liquidator acceptance (event 24), then adds its own
    // إعادة تعيين المصفي entry. Guard that the event stream the story extends is intact.
    const res = await apiGet(session, `/cases/api/v1/court-cases/${GOLDEN_CASE_ID}/events?pageIndex=1&pageSize=50`);
    test.skip(res.status() === 404, 'INH00016 not present (environment reseeded)');
    expect(res.status()).toBe(200);
    const events = ((await res.json())?.data?.items ?? []) as EstateEvent[];
    const sent = events.find((e) => e.eventType === 23);
    const accepted = events.find((e) => e.eventType === 24);
    expect(sent?.eventNameAr, 'event 23 present').toBe('إرسال طلب تعيين للمصفي');
    expect(accepted?.eventNameAr, 'event 24 present').toBe('قبول المصفي لطلب الإسناد');
  });

  // ── Feature not built yet (probe 2026-07-19: reassignment routes -> 404) ───

  test.fixme('@high entry point: ⋮ shows إعادة تعيين المصفي — enabled only with an assigned liquidator', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // Estate file details → header card ⋮ → actions dropdown.
    // BR-2: enabled on INH00016 (has liquidator); disabled (grayed, not clickable)
    // on an estate with no assigned liquidator.
    await page.goto('/estates');
    await page.getByText('INH00016').click();
    await page.getByRole('button', { name: 'المزيد' }).click(); // header ⋮
    const action = page.getByRole('menuitem', { name: REASSIGN_ACTION });
    await expect(action).toBeVisible();
    await expect(action).toBeEnabled();
    // …and on an unassigned estate the same item must be visible but disabled.
  });

  test.fixme('@high step 1: سبب إعادة التعيين is mandatory — التالي stays disabled until filled', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // Dialog "إعادة تعيين المصفي": reason textarea + التالي (disabled) + إلغاء.
    const dialog = page.getByRole('dialog', { name: REASSIGN_ACTION });
    await expect(dialog.getByRole('button', { name: 'التالي' })).toBeDisabled();
    await dialog.getByRole('textbox').fill('تعذر المصفي الحالي عن الاستمرار');
    await expect(dialog.getByRole('button', { name: 'التالي' })).toBeEnabled();
  });

  test.fixme('@high step 2 + Flow A (يدوي): eligible list excludes the current liquidator and sends the request', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // Step 2: آلية التعيين dropdown (يدوي/آلي) + تعيين/رجوع/إلغاء. Selecting يدوي →
    // eligible liquidators list (rank ≥ estate rank, active only) with columns:
    // الاسم | التصنيف | عدد التركات المسندة. BR-4: current liquidator (Majed
    // ALQAHTANI) must NOT appear. Selecting a row enables تأكيد التعيين; confirming
    // sends the assignment request, logs the event and toasts SUCCESS_TOAST.
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').selectOption({ label: 'يدوي' });
    await dialog.getByRole('button', { name: 'تعيين' }).click();
    await expect(dialog.getByRole('columnheader', { name: 'التصنيف' })).toBeVisible();
    await expect(dialog.getByRole('columnheader', { name: 'عدد التركات المسندة' })).toBeVisible();
    await expect(dialog.getByText('Majed ALQAHTANI')).toHaveCount(0); // current excluded
    await dialog.getByRole('row').nth(1).click();
    await dialog.getByRole('button', { name: 'تأكيد التعيين' }).click();
    await expect(page.getByText(SUCCESS_TOAST)).toBeVisible();
  });

  test.fixme('@high Flow B (آلي): proposes a liquidator, with a manual fallback when none is eligible', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // آلي + تعيين → المصفي المقترح (name + rank) with تأكيد / التعيين اليدوي.
    // If no eligible liquidator: NO_ELIGIBLE_MSG + full list shown for manual pick
    // regardless of eligibility (BR-12). تأكيد sends the request + SUCCESS_TOAST.
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').selectOption({ label: 'آلي' });
    await dialog.getByRole('button', { name: 'تعيين' }).click();
    await expect(dialog.getByText('المصفي المقترح').or(dialog.getByText(NO_ELIGIBLE_MSG))).toBeVisible();
  });

  test.fixme('@medium override: a new reassignment withdraws the pending request and notifies its liquidator', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // While a previous request is pending: re-running the flow auto-withdraws it,
    // the previously selected liquidator gets the withdrawal notification
    // ("…تم سحب طلب تعيينكم مصفياً للتركة رقم {رقم التركة}…") and the request
    // disappears from their queue; the new flow proceeds normally (BR-6/7).
  });

  test.fixme('@high access transfer: current liquidator keeps access until acceptance, then loses it', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // BR-8/9: pre-acceptance the outgoing liquidator still reads the estate
    // (GET …/court-cases/{id} with the liquidator token -> 200) and gets NO
    // notification. Post-acceptance: access revoked (403/404), cancellation
    // notification sent, liquidatorAcceptedAt updated to the acceptance date,
    // authorization letter regenerated for the new liquidator. Ongoing records
    // (استفسارات/مخاطبات/إفصاحات drafts) must remain untouched.
  });

  test.fixme('@medium activity log: the إعادة تعيين المصفي event carries the full reassignment details', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // Log entry: الحدث=إعادة تعيين المصفي, تم بواسطة={EM}, date/time, حالة التركة +
    // عرض المزيد details: previous/new liquidator, reason, method (يدوي/آلي).
    // GET /cases/api/v1/court-cases/{id}/events → expect the new event type
    // (id TBD — likely joins 23/24/25 in the assignment family).
    const res = await apiGet(session, `/cases/api/v1/court-cases/${GOLDEN_CASE_ID}/events?pageIndex=1&pageSize=50`);
    const events = ((await res.json())?.data?.items ?? []) as EstateEvent[];
    expect(events.some((e) => e.eventNameAr === REASSIGN_ACTION)).toBeTruthy();
  });

  test.fixme('@medium notifications: new liquidator gets the continuation note; current one only on acceptance', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-967' });
    // New liquidator's request notification = standard assignment notification plus:
    // "يُرجى العلم بأن هذه التركة هي في مرحلة التصفية الفعلية…" (BR-10/11).
    // The reassignment request must carry the backend flag (reassignment vs initial)
    // that JF-968 reads to decide whether the flow-map trigger fires (BR-14).
  });
});
