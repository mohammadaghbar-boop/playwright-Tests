import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, ApiSession } from '../../src/helpers/api';

/**
 * Admin backbone — API-first, read-only. Covers the task-definitions library
 * (JF-16/17/151/152/153) and its versioning field (JF-488), plus the flow-maps
 * catalogue (JF-104/105/108/110). Also pins the RBAC boundary: the EstateManager
 * role must NOT be able to read the users/roles admin APIs (403) — that 403 is a
 * passing security assertion, not a failure.
 *
 * Endpoints verified on CIT 2026-07-16:
 *   GET /tasks/api/v1/task-definitions        -> data.items[] (id, taskNumber, technicalName, status, title, currentVersionNumber)
 *   GET /forms/api/v1/flow-maps               -> array
 *   GET /users/api/v1/users | /roles          -> 403 for EstateManager (admin-only)
 */
test.describe('Admin backbone (API)', () => {
  let session: ApiSession;

  test.beforeAll(async () => {
    session = await apiLogin();
  });
  test.afterAll(async () => {
    await session?.ctx.dispose();
  });

  test('@blocker task-definitions library lists tasks with versioning info', async () => {
    const res = await apiGet(session, '/tasks/api/v1/task-definitions?pageIndex=1&pageSize=10');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const items = body?.data?.items ?? [];
    expect(Array.isArray(items)).toBeTruthy();
    expect(items.length).toBeGreaterThan(0);
    // JF-488: each definition carries a current version number.
    expect(items[0]).toHaveProperty('currentVersionNumber');
    expect(items[0]).toHaveProperty('technicalName');
    expect(items[0]).toHaveProperty('status');
  });

  test('@high flow-maps catalogue responds', async () => {
    const res = await apiGet(session, '/forms/api/v1/flow-maps?pageIndex=1&pageSize=10');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body?.data ?? []);
    expect(Array.isArray(list)).toBeTruthy();
  });

  test('@high RBAC: EstateManager is denied the users admin API (403)', async () => {
    const res = await apiGet(session, '/users/api/v1/users?pageIndex=1&pageSize=10');
    expect(res.status(), 'estate manager must not read the users admin list').toBe(403);
  });

  test('@high RBAC: EstateManager is denied the roles admin API (403)', async () => {
    const res = await apiGet(session, '/users/api/v1/roles');
    expect(res.status()).toBe(403);
  });
});
