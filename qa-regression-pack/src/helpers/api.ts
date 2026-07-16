import { request as pwRequest, APIRequestContext } from '@playwright/test';
import { URLS, TENANT_ID, INTERNAL_USERS } from './users';

/**
 * API client for the JF backend (verified endpoints, CIT).
 * Auth: POST /users/api/v1/auth/login { Email, Password } -> data.accessToken.
 * All calls carry the TenantIdentifier header and ar-SA Accept-Language.
 */
export interface ApiSession {
  ctx: APIRequestContext;
  token: string;
  role?: string;
}

function baseHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    TenantIdentifier: TENANT_ID,
    'Content-Type': 'application/json',
    'Accept-Language': 'ar-SA',
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function decodeJwtRole(token: string): string | undefined {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8')).role;
  } catch {
    return undefined;
  }
}

/** Logs in via the API and returns a reusable authenticated request context. */
export async function apiLogin(
  user = INTERNAL_USERS.estateManager,
): Promise<ApiSession> {
  const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${URLS.api}/users/api/v1/auth/login`, {
    headers: baseHeaders(),
    data: { Email: user.email, Password: user.password },
  });
  if (!res.ok()) throw new Error(`API login failed for ${user.email}: HTTP ${res.status()}`);
  const body = await res.json();
  const token: string = body?.data?.accessToken ?? '';
  if (!token) throw new Error(`API login for ${user.email} returned no accessToken`);
  return { ctx, token, role: decodeJwtRole(token) };
}

/**
 * Build a reusable authenticated request context from an already-obtained bearer
 * token (e.g. one scraped from a demo-panel UI login for a SystemAdmin session,
 * whose password is not available to the API-login helper).
 */
export async function apiSessionFromToken(token: string): Promise<ApiSession> {
  const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
  return { ctx, token, role: decodeJwtRole(token) };
}

export function apiGet(session: ApiSession, path: string) {
  return session.ctx.get(`${URLS.api}${path}`, { headers: baseHeaders(session.token) });
}

export function apiPost(session: ApiSession, path: string, data: unknown) {
  return session.ctx.post(`${URLS.api}${path}`, { headers: baseHeaders(session.token), data });
}

export function apiDelete(session: ApiSession, path: string) {
  return session.ctx.delete(`${URLS.api}${path}`, { headers: baseHeaders(session.token) });
}

/** Verified backbone endpoints (relative paths). */
export const ENDPOINTS = {
  login: '/users/api/v1/auth/login',
  courtCases: (pageIndex = 1, pageSize = 10) =>
    `/cases/api/v1/court-cases?pageIndex=${pageIndex}&pageSize=${pageSize}`,
  courtCase: (id: string) => `/cases/api/v1/court-cases/${id}`,
  heirsListingStatus: (id: string) => `/cases/api/v1/court-cases/${id}/heirs-listing/status`,
  cmaInquiry: (id: string) => `/cases/api/v1/court-cases/${id}/cma-inquiry`,
  samaInquiriesStatus: (id: string) => `/cases/api/v1/court-cases/${id}/sama-inquiries/status`,
  marjeaInquiry: (id: string) => `/cases/api/v1/court-cases/${id}/marjea-inquiry`,
  realEstateTitlesStatus: (id: string) => `/cases/api/v1/court-cases/${id}/real-estate-titles/status`,
  deedInquiriesStatus: (id: string) => `/cases/api/v1/court-cases/${id}/deed-inquiries/status`,
  assetsByCaseGrouped: (id: string) => `/cases/api/v1/assets/by-case/${id}/grouped`,
  referrals: '/cases/api/v1/referrals',
  letterVerifications: '/cases/api/v1/letter-verifications',

  // Flow-map / workflow engine (SystemAdmin-scoped writes; EstateManager -> 403).
  // Verified on CIT 2026-07-16 (round-2 workflow re-test).
  flowMaps: '/forms/api/v1/flow-maps',
  flowMap: (id: string) => `/forms/api/v1/flow-maps/${id}`,
  flowMapActivate: (mapId: string, versionId: string) =>
    `/forms/api/v1/flow-maps/${mapId}/versions/${versionId}/activate`,
  flowMapDeactivate: (mapId: string, versionId: string) =>
    `/forms/api/v1/flow-maps/${mapId}/versions/${versionId}/deactivate`,
  formsLookups: '/forms/api/v1/forms/lookups',
  form: (formId: string) => `/forms/api/v1/forms/${formId}`,
  formDecisionPoints: (formId: string) => `/forms/api/v1/forms/${formId}/decision-points`,
  decisionPoint: (id: string) => `/forms/api/v1/decision-points/${id}`,
  taskDefinitions: (pageIndex = 1, pageSize = 10) =>
    `/tasks/api/v1/task-definitions?pageIndex=${pageIndex}&pageSize=${pageSize}`,
};
