import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {
  apiLogin, apiSessionFromToken, apiGet, apiPost, apiDelete, ApiSession, ENDPOINTS,
} from '../../src/helpers/api';
import { annotateKnownIssue } from '../../src/known-issues';

/**
 * Flow-map / workflow engine — decision points & lifecycle (API-first).
 *
 * ROUND-2 workflow re-test (CIT 2026-07-16). The "Workflows" engine was fixed by
 * the dev lead; this pack re-drives the flow-map stories that were BLOCKED /
 * NOT-TESTABLE in round 1 and pins the newly-passing behaviour.
 *
 * Verified contract (SystemAdmin session — via the demo-users panel; EM is 403 on writes):
 *   GET  /forms/api/v1/flow-maps                                 -> data[] (status 1 = active)
 *   GET  /forms/api/v1/flow-maps/{mapId}                         -> map + versions + currentPublishedVersionId
 *   GET  /forms/api/v1/forms/{formId}                            -> schemaJson (questions)
 *   GET  /forms/api/v1/forms/{formId}/decision-points            -> decision points (answer->task bindings)
 *   POST /forms/api/v1/forms/{formId}/decision-points            -> assign a task to a decision point
 *   DELETE /forms/api/v1/decision-points/{id}                    -> remove a decision point
 *   POST /forms/api/v1/flow-maps/{mapId}/versions/{verId}/activate|deactivate
 *
 * Stories covered:
 *   JF-340 (bug) + JF-108  assign a task to an ACTIVE flow map  (round-1 BLOCKED -> now PASS)
 *   JF-359                 empty-classifier create blocked      (fix holds)
 *   JF-110                 version pinning (published version + task version recorded)
 *   JF-705 / JF-471        asset-level & disclosure classifiers configurable
 *   RBAC                   EstateManager cannot write decision points (403)
 */
interface FlowMapVersion { id: string; versionNumber: number; status: number; formId: string; }
interface FlowMap {
  flowMapId: string;
  formCode: string;
  status: number;
  currentPublishedVersionId?: string | null;
  currentPublishedVersionNumber?: number | null;
  latestVersionNumber?: number;
  assetTypeIds?: number[];
  versions: FlowMapVersion[];
}

const SKIP_NO_ADMIN = 'SystemAdmin token unavailable (demo-panel login) — cannot exercise admin-scoped flow-map writes';

async function fetchFlowMaps(session: ApiSession): Promise<FlowMap[]> {
  const res = await apiGet(session, `${ENDPOINTS.flowMaps}?pageIndex=1&pageSize=100`);
  const data = (await res.json())?.data ?? [];
  return Array.isArray(data) ? data : (data.items ?? []);
}

test.describe('Flow-map decision points & lifecycle (API)', () => {
  let admin: ApiSession | null = null;
  let createdDpId: string | undefined;
  let activeMap: FlowMap | undefined;
  let formId: string | undefined;
  let questionKey: string | undefined;
  let activeTaskId: string | undefined;

  test.beforeAll(async () => {
    // SystemAdmin bearer captured by global-setup (demo-users panel). Read from the
    // cache file; absent/empty => admin-scoped tests skip cleanly.
    const tokenFile = path.resolve(__dirname, '..', '..', '.auth', 'admin-token.txt');
    const token = fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, 'utf8').trim() : '';
    if (!token) return;
    admin = await apiSessionFromToken(token);

    // Pick an ACTIVE, published flow map whose published form has at least one question.
    // NOTE: the flow-maps LIST omits currentPublishedVersionId — only the DETAIL GET
    // carries it — so we fetch each active map's detail before choosing its form.
    const maps = await fetchFlowMaps(admin);
    for (const summary of maps.filter((x) => x.status === 1)) {
      const detailRes = await apiGet(admin, ENDPOINTS.flowMap(summary.flowMapId));
      if (!detailRes.ok()) continue;
      const detail: FlowMap = (await detailRes.json())?.data;
      const ver =
        detail.versions.find((v) => v.id === detail.currentPublishedVersionId) ??
        detail.versions.find((v) => v.status === 2) ??
        detail.versions[detail.versions.length - 1];
      if (!ver?.formId) continue;
      const fr = await apiGet(admin, ENDPOINTS.form(ver.formId));
      if (!fr.ok()) continue;
      const schema = JSON.parse((await fr.json())?.data?.schemaJson ?? '{}');
      const el = (schema.pages ?? []).flatMap((p: { elements?: { name?: string }[] }) => p.elements ?? [])[0];
      if (el?.name) { activeMap = detail; formId = ver.formId; questionKey = el.name; break; }
    }

    // A task with a PUBLISHED version to bind. A decision point only accepts a task
    // that has a published version (currentVersionStatus 2, or a version at status 2);
    // a draft-only task is rejected as DECISION_POINT_TASK_NOT_FOUND_OR_INACTIVE.
    const tr = await apiGet(admin, ENDPOINTS.taskDefinitions(1, 50));
    const items = (await tr.json())?.data?.items ?? [];
    interface TaskItem { id: string; status?: number; currentVersionStatus?: number; versions?: { status?: number }[] }
    activeTaskId = (items as TaskItem[]).find(
      (t) => t.status === 1 && (t.currentVersionStatus === 2 || (t.versions ?? []).some((v) => v.status === 2)),
    )?.id;
  });

  test.afterAll(async () => {
    // Restore any active map we mutated by removing the decision point we added.
    if (admin && createdDpId) {
      await apiDelete(admin, ENDPOINTS.decisionPoint(createdDpId)).catch(() => undefined);
    }
    await admin?.ctx.dispose();
  });

  test('@blocker JF-340/JF-108: assigning an active task to an ACTIVE flow map succeeds (was 400)', async () => {
    test.skip(!admin, SKIP_NO_ADMIN);
    test.skip(!formId || !questionKey || !activeTaskId, 'no active flow map with a question, or no active task, found');
    // Round 1 this returned 400 DECISION_POINT_TASK_NOT_FOUND_OR_INACTIVE (JF-340).
    // Annotated so the reporter flags it as "possibly fixed" now that it passes.
    annotateKnownIssue(test, 'JF-340');
    const res = await apiPost(admin!, ENDPOINTS.formDecisionPoints(formId!), {
      questionKey,
      conditionExpr: `{${questionKey}} = "نعم"`,
      taskDefinitionId: activeTaskId,
      displayOrder: 99,
    });
    expect(res.status(), 'assigning an active task to an active flow map must succeed (JF-340 fix)').toBe(200);
    const body = await res.json();
    expect(body?.isSuccess).toBeTruthy();
    createdDpId = body?.data?.id;
    expect(createdDpId, 'created decision point id').toBeTruthy();
    // JF-110: the binding pins the task's resolved version.
    expect(body?.data?.taskDefinitionVersionId, 'assigned task should be version-pinned (JF-110)').toBeTruthy();
    expect(body?.data?.taskDefinitionVersionNumber).toBeGreaterThan(0);
  });

  test('@high JF-340: the task guard still rejects a not-found/inactive task (400)', async () => {
    test.skip(!admin, SKIP_NO_ADMIN);
    test.skip(!formId || !questionKey, 'no active flow map with a question found');
    const res = await apiPost(admin!, ENDPOINTS.formDecisionPoints(formId!), {
      questionKey,
      conditionExpr: `{${questionKey}} = "x"`,
      taskDefinitionId: '00000000-0000-0000-0000-000000000123',
      displayOrder: 98,
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body?.errorCode).toBe('DECISION_POINT_TASK_NOT_FOUND_OR_INACTIVE');
  });

  test('@high JF-359: creating a flow map with empty classifiers is blocked (per-field validation)', async () => {
    test.skip(!admin, SKIP_NO_ADMIN);
    // Kept annotated until Jira confirms closure; a pass = the fix still holds.
    annotateKnownIssue(test, 'JF-359');
    const res = await apiPost(admin!, ENDPOINTS.flowMaps, { name: '', nameAr: '' });
    expect(res.status()).toBe(400);
    const body = await res.json();
    const details = body?.errorDetails ?? {};
    for (const field of ['NameAr', 'ApplicationId', 'CaseTypeId', 'RoleId', 'StageIds']) {
      expect(details, `missing per-field validation for ${field}`).toHaveProperty(field);
    }
  });

  test('@high JF-705/JF-471: asset-level & disclosure classifiers are configurable', async () => {
    test.skip(!admin, SKIP_NO_ADMIN);
    const lk = await apiGet(admin!, ENDPOINTS.formsLookups);
    expect(lk.status()).toBe(200);
    const d = (await lk.json())?.data ?? {};
    for (const k of ['application', 'caseType', 'stage', 'role', 'assetType', 'assetSubType', 'parentType']) {
      expect(d, `lookup catalogue missing ${k}`).toHaveProperty(k);
    }
    // JF-705: asset-level flow maps exist (a map bound to specific asset types).
    const maps = await fetchFlowMaps(admin!);
    expect(
      maps.some((m) => Array.isArray(m.assetTypeIds) && m.assetTypeIds.length > 0),
      'no asset-level flow map (assetTypeIds bound) found',
    ).toBeTruthy();
  });

  test('@high JF-110: flow-map versioning — published version pinned', async () => {
    test.skip(!admin, SKIP_NO_ADMIN);
    test.skip(!activeMap, 'no active published map found');
    expect(activeMap!.currentPublishedVersionId, 'active map has a pinned published version').toBeTruthy();
    expect(activeMap!.versions.length).toBeGreaterThan(0);
    const published = activeMap!.versions.find((v) => v.id === activeMap!.currentPublishedVersionId);
    expect(published?.status, 'published version carries the published status (2)').toBe(2);
  });

  test('@high RBAC: EstateManager cannot write decision points (403)', async () => {
    test.skip(!formId, 'no target form id resolved');
    const em = await apiLogin(); // default EstateManager
    const res = await apiPost(em, ENDPOINTS.formDecisionPoints(formId!), {
      questionKey: questionKey ?? 'q',
      conditionExpr: 'x',
      taskDefinitionId: activeTaskId ?? '00000000-0000-0000-0000-000000000000',
      displayOrder: 97,
    });
    expect(res.status(), 'flow-map decision-point writes must be admin-scoped').toBe(403);
    await em.ctx.dispose();
  });
});
