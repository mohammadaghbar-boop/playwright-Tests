import { request as playwrightRequest } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

const BASE        = process.env.BASE_API_URL        ?? 'https://d-infath-jf-api.azm-cit.com';
const TENANT      = process.env.TENANT_ID           ?? 'azm-tenant-12345';
const X_API_KEY   = process.env.X_API_KEY           ?? 'your-api-key-here';
const COURT_KEY   = process.env.COURT_API_KEY       ?? 'REPLACE_WITH_SECURE_KEY_IN_SECRETS';
const SAMA_KEY    = process.env.SAMA_CALLBACK_KEY   ?? '';
const CMA_KEY     = process.env.CMA_CALLBACK_KEY    ?? '';
let _emToken: string | null = null;

export async function getEstateManagerToken(): Promise<string> {
  if (_emToken) return _emToken;
  // Allow a pre-supplied token via env (previously only browser-auth.ts honoured this;
  // kept here so the two now-unified callers behave identically).
  if (process.env.ESTATE_MANAGER_TOKEN) {
    _emToken = process.env.ESTATE_MANAGER_TOKEN;
    return _emToken;
  }
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/users/api/v1/auth/login`, {
    headers: { 'TenantIdentifier': TENANT, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA' },
    data: {
      Email:    process.env.ESTATE_MANAGER_EMAIL    ?? 'demo-estate-manager@azm.sa',
      Password: process.env.ESTATE_MANAGER_PASSWORD ?? 'Azm@123',
    },
  });
  const body = JSON.parse(await res.text());
  const token = body?.data?.accessToken ?? '';
  if (!token) throw new Error(`Estate Manager login failed: ${JSON.stringify(body).substring(0, 200)}`);
  console.log('✔ Estate Manager token obtained');
  _emToken = token;
  await ctx.dispose();
  return token;
}

// ── Shared state ──────────────────────────────────────────────────────────
let _token: string | null = null;

/**
 * Log in with the super-admin account and cache the Bearer token.
 * Discovered endpoint: POST /users/api/v1/auth/login  (loginApi in AuthService)
 * Response shape: { isSuccess, data: { accessToken, refreshToken } }
 */
export async function getToken(): Promise<string> {
  if (_token) return _token;

  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/users/api/v1/auth/login`, {
    headers: {
      'TenantIdentifier': TENANT,
      'Content-Type': 'application/json',
      'Accept-Language': 'ar-SA',
    },
    data: {
      Email:    process.env.SUPER_ADMIN_EMAIL    ?? 'superadmin@infath.sa',
      Password: process.env.SUPER_ADMIN_PASSWORD ?? 'le8me!n123',
    },
  });

  const rawBody = await res.text();
  if (!res.ok()) {
    await ctx.dispose();
    throw new Error(`Login failed HTTP ${res.status()}: ${rawBody.substring(0, 300)}`);
  }

  const json = JSON.parse(rawBody);
  const token: string = json.data?.accessToken ?? json.data?.access_token ?? json.accessToken ?? '';
  if (!token) {
    await ctx.dispose();
    throw new Error(`Login returned 200 but no accessToken. Keys: ${JSON.stringify(Object.keys(json))}`);
  }

  console.log(`✔ Token obtained from ${BASE}/users/api/v1/auth/login`);
  _token = token;
  await ctx.dispose();
  return token;
}

// ── Shared API context (built after token is ready) ───────────────────────
let _apiCtx: Awaited<ReturnType<typeof playwrightRequest.newContext>> | null = null;

async function api() {
  if (_apiCtx) return _apiCtx;
  // Ensure token is available before creating context
  const token = await getToken();
  // Double-check: another call may have created context while we awaited getToken
  if (_apiCtx) return _apiCtx;
  _apiCtx = await playwrightRequest.newContext({
    ignoreHTTPSErrors: true,
    baseURL: BASE,
    extraHTTPHeaders: {
      'TenantIdentifier': TENANT,
      'Accept-Language':  'ar-SA',
      'Content-Type':     'application/json',
      'x-api-key':        X_API_KEY,
      'X-Court-Api-Key':  COURT_KEY,
      'Authorization':    `Bearer ${token}`,
    },
  });
  return _apiCtx;
}

export async function disposeApiContext() {
  if (_apiCtx) { await _apiCtx.dispose(); _apiCtx = null; }
}

// ── Referral ───────────────────────────────────────────────────────────────
export async function postReferral(body: object) {
  // Retry up to 6x on 5xx with increasing delay
  for (let attempt = 0; attempt < 6; attempt++) {
    const ctx = await api();
    const res = await ctx.post(`${BASE}/cases/api/v1/referrals`, { data: body });
    if (res.status() < 500) return res;
    console.warn(`[API] POST /referrals returned ${res.status()} — retry ${attempt + 1}/6`);
    _apiCtx = null;
    await new Promise(r => setTimeout(r, 3000 + attempt * 2000)); // 3s, 5s, 7s, 9s, 11s
  }
  return (await api()).post(`${BASE}/cases/api/v1/referrals`, { data: body });
}

// ── Wake / re-inquire ──────────────────────────────────────────────────────
export async function postWake(caseId: string) {
  const token = await getEstateManagerToken();
  for (let attempt = 0; attempt < 5; attempt++) {
    const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
    const res = await ctx.post(`${BASE}/cases/api/v1/court-cases/${caseId}/heirs-listing/re-inquire`, {
      headers: {
        'TenantIdentifier': TENANT, 'Content-Type': 'application/json',
        'Accept-Language': 'ar-SA', 'x-api-key': X_API_KEY,
        'X-Court-Api-Key': COURT_KEY, 'Authorization': `Bearer ${token}`,
      },
      data: {},
    });
    await ctx.dispose();
    if (res.status() < 500) return res;
    console.warn(`[API] wake returned ${res.status()} — retry ${attempt + 1}/5`);
    await new Promise(r => setTimeout(r, 3000));
  }
  const ctx2 = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const r = await ctx2.post(`${BASE}/cases/api/v1/court-cases/${caseId}/heirs-listing/re-inquire`, {
    headers: { 'TenantIdentifier': TENANT, 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA', 'x-api-key': X_API_KEY, 'X-Court-Api-Key': COURT_KEY, 'Authorization': `Bearer ${token}` },
    data: {},
  });
  await ctx2.dispose();
  return r;
}

/** Wake with an explicit token — used by TC-026 security tests */
export async function postWakeWithToken(caseId: string, token: string) {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/cases/api/v1/court-cases/${caseId}/heirs-listing/re-inquire`, {
    headers: { 'TenantIdentifier': TENANT, 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    data: {},
  });
  await ctx.dispose();
  return res;
}

/** Wake with no auth header — used by TC-026 */
export async function postWakeNoAuth(caseId: string) {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/cases/api/v1/court-cases/${caseId}/heirs-listing/re-inquire`, {
    headers: { 'TenantIdentifier': TENANT, 'Content-Type': 'application/json' },
    data: {},
  });
  await ctx.dispose();
  return res;
}

// ── SAMA callbacks ─────────────────────────────────────────────────────────
// Single endpoint, body key discriminates inquiry type (QA Guide §4.2 + §9.3)
const SAMA_BODY_KEY: Record<number, string> = {
  1: 'RPGetAcctsInfoCallBackRq',
  2: 'RPGetSafsInfoCallBackRq',
  3: 'RPGetBalsInfoCallBackRq',
  4: 'RPGetDepotsInfoCallBackRq',
  5: 'RPGetLiabsInfoCallBackRq',
};

/** Build the full Envelope-wrapped SAMA callback body (exact format from QA guide §2) */
function samaBody(inquiryType: number, msgUid: string): object {
  const bodyKey = SAMA_BODY_KEY[inquiryType];
  // Inner data block with representative QA test data per type
  const innerData: Record<number, object> = {
    3: { FIRsGetBalsInfo: [{ FICode: '7', FIRsStatus: 'S0000000', AcctsList: { AccInfo: [{ JntAcc: 'n', AccStatus: '01', IBAN: 'SA-QA-CASH-0001', TotBal: '2.37', AvailBal: '2.37', AccNum: 'QA-CASH-0001', AccType: 'CURRENT ACCOUNT', AccCur: '1', BalDt: '2026-04-27', PrdUsrsList: { UsrInfo: [{ IdType: '1', Name: 'name', Id: '1198639757', UsrType: '01' }] } }] } }] },
    4: { FIRsGetDepotsInfo: [{ FICode: '1', FIRsStatus: 'S0000000', DepotsList: { DepotInfo: [{ DepotNum: 'QA-DEP-0001', DepotBal: '50000.00', DepotCur: '1', DepotType: 'وديعة لأجل', DepotStatus: '01', JntAcc: 'n', PrdUsrsList: { UsrInfo: [{ Name: 'name', UsrType: '01', Id: '1198639757', IdType: '1' }] } }] } }] },
    2: { FIRsGetSafsInfo: [{ FICode: '7', FIRsStatus: 'S0000000', SafsList: { SafInfo: [{ SafNum: 'QA-SAF-0001', JntAcc: 'n', SafBrnch: '63100.AlNakheel', OpnDt: '2025-06-23', PrdUsrsList: { UsrInfo: [{ Id: '1198639757', IdType: '1', Name: 'name', UsrType: '01' }] } }] } }] },
    5: { FIRsGetLiabsInfo: [{ FICode: '7', FIRsStatus: 'S0000000', LiabsList: { LiabInfo: [{ AccNum: 'QA-LIAB-0001', LiabType: 'RE', LiabCur: '1', TotLiabAmt: '499402.8', RmngLiabAmt: '448325.68' }] } }] },
    1: { FIRsGetAcctsInfo: [{ FICode: '7', FIRsStatus: 'S0000000', AcctsList: { AccInfo: [{ AccNum: 'QA-HEIR-ACC-1', JntAcc: 'n', IBAN: 'SA-QA-HEIR-0001', AccStatus: '01', AccType: 'CURRENT ACCOUNT', AccCur: '1', PrdUsrsList: { UsrInfo: [{ Name: 'name', UsrType: '01', Id: '1198639757', IdType: '1' }] } }] } }] },
  };
  return {
    Envelope: {
      Header: { MsgHdrRq: { MsgUID: msgUid, Status: 'S0000000' } },
      Body: { [bodyKey]: innerData[inquiryType] ?? {} },
    },
  };
}

export async function postSamaCallback(inquiryType: number, msgUid: string) {
  return (await api()).post(`${BASE}/cases/api/v1/sama-callbacks`, {
    headers: { 'X-Sama-Callback-Auth': SAMA_KEY },
    data: samaBody(inquiryType, msgUid),
  });
}

/**
 * Zero-item SAMA callback — same envelope shape as samaBody() but with an empty
 * FIRsGet*Info array, so the upsert service creates no assets/liabilities/heir-accounts
 * for this inquiry type. Used to pre-empt the mock's own automatic (non-empty) webhook
 * via the backend's idempotency bouncer (unique msg_uid + Status==Succeeded no-op guard
 * in ProcessSamaCallbackCommandHandler) so we can control classifiedAssetsCount exactly.
 */
export async function postSamaCallbackEmpty(inquiryType: number, msgUid: string) {
  const bodyKey = SAMA_BODY_KEY[inquiryType];
  return (await api()).post(`${BASE}/cases/api/v1/sama-callbacks`, {
    headers: { 'X-Sama-Callback-Auth': SAMA_KEY },
    data: {
      Envelope: {
        Header: { MsgHdrRq: { MsgUID: msgUid, Status: 'S0000000' } },
        Body: { [bodyKey]: { [`FIRsGet${bodyKey.replace('RPGet', '').replace('CallBackRq', '')}`]: [] } },
      },
    },
  });
}

/** TC-025: send SAMA callback with an explicit (possibly invalid) auth key */
export async function postSamaCallbackWithAuth(inquiryType: number, msgUid: string, authKey: string) {
  const token = await getToken();
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/cases/api/v1/sama-callbacks`, {
    headers: {
      'TenantIdentifier': TENANT, 'Content-Type': 'application/json',
      'Accept-Language':  'ar-SA', 'x-api-key': X_API_KEY,
      'X-Court-Api-Key':  COURT_KEY, 'Authorization': `Bearer ${token}`,
      ...(authKey ? { 'X-Sama-Callback-Auth': authKey } : {}),
    },
    data: { [SAMA_BODY_KEY[inquiryType]]: { MsgUID: msgUid } },
  });
  await ctx.dispose();
  return res;
}

// ── CMA callback ───────────────────────────────────────────────────────────
// Endpoint: POST /cases/api/v1/cma-callbacks  Auth: X-Cma-Callback-Auth
// Body: SOAP-style JSON envelope with NafithNumber (QA Guide §3.2 + §9.3)
/** CMA callback — exact Envelope format from QA guide §2(f) */
/** Zero-item CMA callback — empty InquiryReplies, so no Investment assets get created. */
export async function postCmaCallbackEmpty(nafithNumber: string) {
  return (await api()).post(`${BASE}/cases/api/v1/cma-callbacks`, {
    headers: { 'X-Cma-Callback-Auth': CMA_KEY },
    data: {
      Envelope: {
        Header: { SOAPHeader: { SourceName: 'CMA', Parameters: [{ Name: 'MsgId', Value: 'CMA-MSG-QA' }] } },
        Body: { Result: { NafithNumber: nafithNumber, ReplyStatus: '2', ReplyDate: '2026-04-13', InquiryReplies: [] } },
      },
    },
  });
}

export async function postCmaCallback(nafithNumber: string, accountNumber: string, portfolioNumber: string) {
  return (await api()).post(`${BASE}/cases/api/v1/cma-callbacks`, {
    headers: { 'X-Cma-Callback-Auth': CMA_KEY },
    data: {
      Envelope: {
        Header: { SOAPHeader: { SourceName: 'CMA', Parameters: [{ Name: 'MsgId', Value: 'CMA-MSG-QA' }] } },
        Body: {
          Result: {
            NafithNumber: nafithNumber,
            ReplyStatus: '2',
            ReplyDate: '2026-04-13',
            InquiryReplies: [{
              APNumber: '4',
              HasRestrictions: 'false',
              InvestmentAccounts: [
                { AccountBalance: '700.44', AccountNumber: accountNumber },
                { AccountBalance: '0.44',  AccountNumber: `${accountNumber}-B` },
              ],
              InvestmentPortfolios: [{
                CompanyName: 'إعمار المدينة الإقتصادية',
                SharesQuantity: '14',
                PortfolioNumber: portfolioNumber,
                MarketPrice: '10.23',
                IsLocal: 'true',
              }],
            }],
          },
        },
      },
    },
  });
}
