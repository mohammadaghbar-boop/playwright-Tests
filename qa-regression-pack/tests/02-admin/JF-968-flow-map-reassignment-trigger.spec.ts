import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession, ENDPOINTS } from '../../src/helpers/api';

/**
 * JF-968 — إضافة نوع محفز: إعادة تعيين المصفي / Add Trigger Type: Liquidator
 * Reassignment (flow-map setup). Sprint-13, story status: Backlog — NOT developed yet.
 *
 * Admin side: the Trigger Type dropdown gains إعادة تعيين المصفي (next to the
 * existing إنشاء إفصاح جديد / إضافة أصل); selecting it auto-selects ALL stage values
 * (الحصر / الإدارة والحراسة / التهيئة) and locks المرحلة read-only. Runtime side:
 * when a new liquidator ACCEPTS a reassignment request (JF-967), every matching
 * PUBLISHED flow map with this trigger lands in the estate's Task Engine as a fresh
 * لم تُبدأ entry.
 *
 * CIT probe 2026-07-19 (read-only, EstateManager token — flow-map READS are open;
 * writes stay SystemAdmin-scoped):
 *   - The flow-map contract ALREADY exposes `triggerType` on both the list and the
 *     detail GET — but it is null on all 31 maps, and nothing named
 *     "إعادة تعيين المصفي" exists anywhere in /forms/api/v1/forms/lookups (which has
 *     no trigger catalogue at all: application/caseType/stage/role/parentType/
 *     assetType/assetSubType only). The trigger option is NOT built yet.
 *   - The stage lookup carries exactly the three stages the story auto-locks
 *     (301 الحصر, 302 الادارة و الحراسة, 303 التهيئة).
 */
const REASSIGN_TRIGGER = 'إعادة تعيين المصفي';
const EXISTING_TRIGGERS = ['إنشاء إفصاح جديد', 'إضافة أصل'];

interface LookupItem { id: number; value: string; labelAr: string; }
interface FlowMapSummary {
  flowMapId: string;
  nameAr: string;
  status: number;
  triggerType: unknown;
  stageIds: number[];
}

test.describe('JF-968 flow-map trigger type: liquidator reassignment', () => {
  let session: ApiSession;

  test.beforeAll(async () => {
    session = await apiLogin(); // EstateManager — flow-map reads verified 200 on CIT
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  // ── Live today: the config surface the trigger plugs into ──────────────────

  test('@high flow-map contract already exposes triggerType on list and detail', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    const res = await apiGet(session, `${ENDPOINTS.flowMaps}?pageIndex=1&pageSize=100`);
    expect(res.status()).toBe(200);
    const data = (await res.json())?.data;
    const maps = (Array.isArray(data) ? data : data?.items ?? []) as FlowMapSummary[];
    expect(maps.length, 'flow maps configured on CIT').toBeGreaterThan(0);
    // The field the story populates must exist in the payload (currently null).
    expect(maps[0], 'list item carries the triggerType field').toHaveProperty('triggerType');

    const det = await apiGet(session, ENDPOINTS.flowMap(maps[0].flowMapId));
    expect(det.status()).toBe(200);
    const detail = (await det.json())?.data;
    expect(detail, 'detail carries the triggerType field').toHaveProperty('triggerType');
    expect(detail, 'detail carries stageIds (the field the trigger will lock)').toHaveProperty('stageIds');
  });

  test('@high stage lookup carries exactly the three stages the trigger auto-locks', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // BR-2 auto-selects ALL existing stage values — that set must stay
    // الحصر / الادارة والحراسة / التهيئة (ids 301/302/303).
    const res = await apiGet(session, ENDPOINTS.formsLookups);
    expect(res.status()).toBe(200);
    const stages = ((await res.json())?.data?.stage ?? []) as LookupItem[];
    expect(stages.map((s) => s.id).sort()).toEqual([301, 302, 303]);
    expect(stages.find((s) => s.id === 301)?.labelAr).toContain('الحصر');
    expect(stages.find((s) => s.id === 302)?.labelAr).toContain('الحراسة');
    expect(stages.find((s) => s.id === 303)?.labelAr).toContain('التهيئة');
  });

  // ── Feature not built yet (probe 2026-07-19: no trigger catalogue/option) ──

  test.fixme('@high the Trigger Type dropdown lists إعادة تعيين المصفي next to the existing triggers', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // Flow Map Management → New Flow Map → Trigger Type dropdown must offer:
    // إنشاء إفصاح جديد (existing) / إضافة أصل (existing) / إعادة تعيين المصفي (new).
    // API-wise, expect either a trigger catalogue in /forms/api/v1/forms/lookups or
    // a documented triggerType enum accepted by POST /forms/api/v1/flow-maps.
    await page.goto('/flowchart-management');
    await page.getByRole('button', { name: /خريطة جديدة|إنشاء/ }).click();
    const dropdown = page.getByRole('combobox', { name: /نوع المحفز|المُحفِّز/ });
    await dropdown.click();
    for (const opt of [...EXISTING_TRIGGERS, REASSIGN_TRIGGER]) {
      await expect(page.getByRole('option', { name: opt })).toBeVisible();
    }
  });

  test.fixme('@high selecting the trigger auto-selects ALL stages and makes المرحلة read-only', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // BR-2: on selecting إعادة تعيين المصفي, المرحلة = {الحصر، الإدارة والحراسة،
    // التهيئة} all selected + read-only (cannot change/add/remove). Primary Type
    // stays editable (تركة/أصل). No extra fields appear.
    await page.getByRole('option', { name: REASSIGN_TRIGGER }).click();
    const stageField = page.getByRole('combobox', { name: 'المرحلة' });
    await expect(stageField).toBeDisabled();
    for (const stage of ['الحصر', 'الحراسة', 'التهيئة']) {
      await expect(page.getByText(stage)).toBeVisible();
    }
    await expect(page.getByRole('combobox', { name: 'النوع الرئيسي' })).toBeEnabled();
  });

  test.fixme('@medium switching to another trigger clears the auto-selected stages and unlocks المرحلة', async ({ page }) => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // BR-3 / exception 4: choose إعادة تعيين المصفي, then switch to إضافة أصل —
    // the stage values are cleared (nothing retained) and المرحلة is editable again.
    await page.getByRole('combobox', { name: /نوع المحفز/ }).click();
    await page.getByRole('option', { name: 'إضافة أصل' }).click();
    const stageField = page.getByRole('combobox', { name: 'المرحلة' });
    await expect(stageField).toBeEnabled();
    // and the previously auto-selected stage chips are gone.
  });

  test.fixme('@high Trigger Type is mandatory — the flow map cannot be saved/published without it', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // BR-1. Expect POST /forms/api/v1/flow-maps without a trigger to join the
    // JF-359-style per-field validation (400 with a TriggerType errorDetails entry).
    // (SystemAdmin-scoped write — use the admin token via .auth/admin-token.txt,
    // same pattern as flow-map-decision-points-api.spec.ts, and delete any draft
    // created if the API ever accepts it.)
  });

  test.fixme('@high runtime: reassignment ACCEPTANCE adds every matching published map to the Task Engine', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // BR-4/5/6/10: on the NEW liquidator accepting a reassignment request (JF-967),
    // all PUBLISHED maps with triggerType=إعادة تعيين المصفي whose scoping fields
    // (Application/Case Type/Primary Type/Role) match the estate appear as separate
    // Task Engine entries — status لم تُبدأ with a بدء button, assigned to the NEW
    // liquidator only. Verify via GET /tasks/api/v1/tasks/by-case/{caseId} plus the
    // task-engine tab. The trigger must fire on acceptance, NOT on the manager's
    // confirmation; a pending (or withdrawn) request fires nothing (exception 5).
  });

  test.fixme('@medium draft maps never trigger at runtime', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // BR-7 / exception 2: a DRAFT map with matching trigger + scope is ignored on
    // acceptance. With one published + one draft matching map, exactly the published
    // one lands in the Task Engine.
  });

  test.fixme('@medium the trigger fires once per acceptance event — repeat reassignments stack new instances', async () => {
    test.info().annotations.push({ type: 'story', description: 'JF-968' });
    // BR-4: each acceptance on the same estate adds a NEW separate flow-map instance
    // in the Task Engine regardless of how many reassignments happened before.
  });
});
