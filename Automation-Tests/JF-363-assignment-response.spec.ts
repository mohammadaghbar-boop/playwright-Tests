/**
 * JF-363 — Liquidator: Accept/Reject the assignment request (API regression guard).
 *
 * API-first, read-only. Guards the persistent OUTCOMES verified against real completed
 * assignments: ACCEPT carries the liquidator onto the estate at «قيد العمل» (status 11);
 * REJECT leaves the estate pending «قيد تعيين مصفي» (status 10) with no liquidator carried
 * and the rejecter excluded. Fresh accept/reject on demand needs a PENDING request, which
 * is gated by a fresh assignment (JF-171 classification pipeline) — so this guards the
 * durable end-state rather than re-driving the click.
 *
 * Golden fixtures: INH00016 (accepted), INH00018 (rejected). Endpoints exercised in the
 * run: POST /assignment/accept {} and POST /assignment/reject {reason}.
 * Traceability: TC-363-01/03/05/06/07/08.
 */
import { test, expect, request as apiRequest, type APIRequestContext } from '@playwright/test';

const API = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT = process.env.TENANT_ID ?? 'azm-tenant-12345';
const EM_EMAIL = process.env.ESTATE_MANAGER_EMAIL ?? 'demo-estate-manager@azm.sa';
const EM_PASS = process.env.ESTATE_MANAGER_PASSWORD ?? 'Azm@123';
const ACCEPTED = 'INH00016';
const REJECTED = 'INH00018';
const STATUS_WORKING = 11; // «قيد العمل» (accepted)
const STATUS_PENDING = 10; // «قيد تعيين مصفي» (awaiting assignment / after reject)

let ctx: APIRequestContext;
let token = '';

test.beforeAll(async () => {
  ctx = await apiRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${API}/users/api/v1/auth/login`, {
    headers: { TenantIdentifier: TENANT, 'Content-Type': 'application/json' },
    data: { Email: EM_EMAIL, Password: EM_PASS },
  });
  token = (await res.json())?.data?.accessToken ?? '';
});
test.afterAll(async () => { await ctx?.dispose(); });

async function findCase(fileNumber: string) {
  const res = await ctx.get(`${API}/cases/api/v1/court-cases?pageIndex=1&pageSize=50`, {
    headers: { TenantIdentifier: TENANT, Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const items = (await res.json())?.data?.items ?? [];
  return items.find((i: { fileNumber: string }) => i.fileNumber === fileNumber) as
    | { fileNumber: string; status: number; liquidatorName: string | null }
    | undefined;
}

test.describe('JF-363 liquidator accept/reject (API regression guard)', () => {
  test('@high an accepted assignment persists (liquidator carried, working status)', async () => {
    expect(token, 'EstateManager login failed').toBeTruthy();
    const res = await ctx.get(`${API}/cases/api/v1/court-cases?pageIndex=1&pageSize=50`, {
      headers: { TenantIdentifier: TENANT, Authorization: `Bearer ${token}` },
    });
    const items = (await res.json())?.data?.items ?? [];
    const acceptedWorking = items.filter(
      (i: { status: number; liquidatorName: string | null }) => i.liquidatorName && i.status === STATUS_WORKING,
    );
    expect(acceptedWorking.length, 'no estate is at «قيد العمل» with a liquidator — accept lifecycle may be broken').toBeGreaterThan(0);
  });

  test('@medium ACCEPT: INH00016 carries its liquidator at «قيد العمل»', async () => {
    const c = await findCase(ACCEPTED);
    test.skip(!c, `${ACCEPTED} not present (reseeded)`);
    expect(c!.liquidatorName, 'accepted estate should carry the liquidator').toBeTruthy();
    expect(c!.status, 'accepted estate should be «قيد العمل»').toBe(STATUS_WORKING);
  });

  test('@medium REJECT: INH00018 was not assigned (no liquidator, still pending)', async () => {
    const c = await findCase(REJECTED);
    test.skip(!c, `${REJECTED} not present (reseeded)`);
    expect(c!.liquidatorName, 'a rejected assignment must not carry a liquidator').toBeFalsy();
    expect(c!.status, 'after reject the estate remains «قيد تعيين مصفي»').toBe(STATUS_PENDING);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // BLOCKED ACs — present and ready; run once the blockers are fixed.
  // All need a FRESH PENDING assignment (an estate assigned but not yet accepted),
  // currently unobtainable because a fresh classification can't run — blocked by:
  //   JF-717 (SAMA inquiry retry never triggered → no fresh classification)
  //   JF-927 / JF-735 (readiness). TC-15 also needs a dev fault-injection hook.
  // To enable: fix JF-717/JF-927, seed a fresh pending assignment for the
  // liquidator (set JF363_PENDING_ESTATE), then remove `.fixme`.
  // ──────────────────────────────────────────────────────────────────────────

  test.fixme('@blocked-JF717 sensitive data is not displayed before acceptance [TC-363-11]', async () => {
    // AC: "Before acceptance ... restricted sensitive data is not displayed".
    // Setup: a PENDING assignment (JF363_PENDING_ESTATE) viewed as the assigned liquidator.
    // Assert the pre-acceptance case view omits: bank info, deceased ID, heirs IDs/mobile/email/IBAN,
    // national address.
  });

  test.fixme('@blocked-JF717 inheritance file is read-only before acceptance [TC-363-12]', async () => {
    // AC: "Before acceptance, the inheritance file is displayed in read-only mode".
    // Setup: PENDING assignment viewed as the liquidator; assert no edit/mutation actions are permitted.
  });

  test.fixme('@blocked-JF717 request expires after 48h with no response [TC-363-13]', async () => {
    // AC: "If no response is taken within 48 hours, the assignment request expires" + removed from list.
    // Setup: a pending request aged past 48h; run the expiry job; assert expiry + removal + reassignment.
  });

  test.fixme('@blocked-devhook accept/reject are transactional — no partial updates [TC-363-15]', async () => {
    // AC: "Accept and reject actions are completed transactionally without partial updates".
    // Setup: inject a mid-accept failure (needs a dev fault hook); assert status/buttons unchanged and
    // no partial state persisted.
  });
});
