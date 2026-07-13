/**
 * browser-auth.ts — zero-manual-steps auth for CloudBeaver and Estate Manager.
 *
 * CloudBeaver strategy (in order):
 *  1. Try service account (jf157test / Jf157Test@123) — works after first bootstrap
 *  2. Try CB_ADMIN_USER / CB_ADMIN_PASS from .env — admin credentials to bootstrap
 *  3. Try CB_SESSION_ID from .env — browser session cookie as last resort
 *
 * On first run: set CB_ADMIN_USER and CB_ADMIN_PASS in .env with admin credentials,
 * then run once — the service account is created automatically.
 * All subsequent runs use the service account — no session cookie or admin creds needed.
 */
import * as https from 'https';
import { createHash } from 'node:crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const CB_HOST  = 'd-infath-db.azm-cit.com';
const SVC_USER = 'jf157test';
const SVC_PASS = 'Jf157Test@123';
const agent    = new https.Agent({ rejectUnauthorized: false });

let _emToken: string | null = null;
let _cbSession: string | null = null;

// ── HTTP helper ────────────────────────────────────────────────────────────

async function cbGql(query: string, cookieHeader?: string): Promise<{ body: string; cookies: string[] }> {
  const bodyStr = JSON.stringify({ query });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: CB_HOST, path: '/api/gql', method: 'POST', agent,
      headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    }, res => {
      let data = '';
      const cookies = (res.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]);
      res.on('data', (d: Buffer) => data += d);
      res.on('end', () => resolve({ body: data, cookies }));
    });
    // No timeout previously -- a stalled relay connection left this pending forever with no
    // error, blocking the whole test silently. See the matching fix in jf157-db-client.ts.
    req.setTimeout(20_000, () => req.destroy(new Error('CB_TIMEOUT')));
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function cbLogin(user: string, pass: string): Promise<{ sessionId: string; conns: any[] } | null> {
  const s1 = await cbGql('mutation { openSession(defaultLocale: "en") { valid } }');
  const sessionCookie = s1.cookies.join('; ');

  // CloudBeaver's "local" auth provider expects an MD5 hash of the password (this is CB's own
  // web-client protocol, not a security choice of ours) — mirrors utils/db-client.ts:105, which
  // hashes before calling authLogin. Sending the raw password here always fails authentication.
  const passwordHash = createHash('md5').update(pass, 'utf8').digest('hex').toUpperCase();

  const s2 = await cbGql(
    `{ authLogin(provider: "local", credentials: {user: "${user}", password: "${passwordHash}"}) { authId authStatus } }`,
    sessionCookie
  );
  const parsed = JSON.parse(s2.body);
  const status = parsed.data?.authLogin?.authStatus;
  if (parsed.errors || (status !== 'SUCCESS' && status !== 'AUTHENTICATED')) return null;

  const s3 = await cbGql('{ userConnections { id name } }', sessionCookie);
  const conns = JSON.parse(s3.body).data?.userConnections ?? [];

  return { sessionId: sessionCookie, conns };
}

async function createServiceAccount(adminCookieOrSessionId: string): Promise<boolean> {
  const adminCookie = adminCookieOrSessionId.includes('=') ? adminCookieOrSessionId : `cb-session-id=${adminCookieOrSessionId}`;
  try {
    // Create the user
    const create = await cbGql(
      `mutation { createUser(userId: "${SVC_USER}", enabled: true, grantPermissions: []) { userId enabled } }`,
      adminCookie
    );
    const createParsed = JSON.parse(create.body);
    if (createParsed.errors && !createParsed.errors[0].message.includes('already exists')) {
      console.warn('[browser-auth] createUser error:', createParsed.errors[0].message);
      return false;
    }

    // Set password — hashed the same way authLogin expects it (see cbLogin above), so the
    // service account can actually log in afterward instead of silently mismatching.
    const svcPasswordHash = createHash('md5').update(SVC_PASS, 'utf8').digest('hex').toUpperCase();
    const setPwd = await cbGql(
      `mutation { setUserCredentials(userId: "${SVC_USER}", providerId: "local", credentials: {password: "${svcPasswordHash}"}) }`,
      adminCookie
    );
    const setPwdParsed = JSON.parse(setPwd.body);
    if (setPwdParsed.errors) {
      console.warn('[browser-auth] setUserCredentials error:', setPwdParsed.errors[0].message);
      return false;
    }

    // Grant all accessible connections
    const conns = await cbGql('{ allConnections { id } }', adminCookie);
    const connList = JSON.parse(conns.body).data?.allConnections ?? [];
    for (const conn of connList) {
      await cbGql(
        `mutation { addConnectionsAccess(connectionId: "${conn.id}", subjects: ["${SVC_USER}"]) }`,
        adminCookie
      );
    }

    console.log(`[browser-auth] ✔ CloudBeaver service account '${SVC_USER}' created`);
    return true;
  } catch (e: any) {
    console.warn('[browser-auth] Could not create service account:', e.message?.substring(0, 80));
    return false;
  }
}

// ── Public: CloudBeaver session ────────────────────────────────────────────

export async function getCloudBeaverSession(): Promise<string> {
  if (_cbSession) return _cbSession;

  // Step 1: Try service account — works on all runs after first bootstrap
  const svcResult = await cbLogin(SVC_USER, SVC_PASS);
  if (svcResult) {
    console.log(`[browser-auth] OK CloudBeaver service account | connections: ${svcResult.conns.map((c: any) => c.name).join(', ')}`);
    _cbSession = svcResult.sessionId;
    return _cbSession;
  }

  // Step 2: Try admin credentials from .env — use directly, no service account needed
  const adminUser = process.env.CB_ADMIN_USER;
  const adminPass = process.env.CB_ADMIN_PASS;

  if (adminUser && adminPass) {
    const adminResult = await cbLogin(adminUser, adminPass);
    if (adminResult) {
      console.log(`[browser-auth] OK CloudBeaver admin login | connections: ${adminResult.conns.map((c: any) => c.name).join(', ')}`);
      _cbSession = adminResult.sessionId;
      return _cbSession;
    }
  }

  // Step 3: Fall back to manual CB_SESSION_ID (browser cookie)
  const envSessionId = process.env.CB_SESSION_ID;
  if (envSessionId) {
    const adminCookie = `cb-session-id=${envSessionId}`;
    const test = await cbGql('{ userConnections { id name } }', adminCookie);
    let parsed: any;
    try { parsed = JSON.parse(test.body); } catch { parsed = {}; }
    const conns: any[] = parsed.data?.userConnections ?? [];
    if (conns.length) {
      // Opportunistically bootstrap service account while we have an admin session
      console.log(`[browser-auth] Using CB_SESSION_ID — bootstrapping service account for future runs...`);
      await createServiceAccount(adminCookie);
      console.log(`[browser-auth] OK CloudBeaver session | connections: ${conns.map((c: any) => c.name).join(', ')}`);
      _cbSession = envSessionId;
      return envSessionId;
    }
  }

  throw new Error(
    'CloudBeaver: cannot authenticate. Options:\n' +
    '  A) Set CB_ADMIN_USER and CB_ADMIN_PASS in .env with admin credentials — service account auto-created on first run\n' +
    '  B) Set CB_SESSION_ID in .env: open https://d-infath-db.azm-cit.com, log in, F12 → Application → Cookies → copy cb-session-id\n' +
    '  After option A or B succeeds once, jf157test service account is created and no further setup is needed.'
  );
}

// ── Public: Estate Manager token ──────────────────────────────────────────

export async function getEstateManagerToken(): Promise<string> {
  if (_emToken) return _emToken;

  // Try env first
  if (process.env.ESTATE_MANAGER_TOKEN) {
    _emToken = process.env.ESTATE_MANAGER_TOKEN;
    return _emToken;
  }

  // Login via API (Azm@123 works for demo-estate-manager@azm.sa on the local provider)
  const { request } = await import('@playwright/test');
  const BASE = process.env.BASE_API_URL ?? 'https://d-infath-jf-api.azm-cit.com';
  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const res = await ctx.post(`${BASE}/users/api/v1/auth/login`, {
    headers: { 'TenantIdentifier': process.env.TENANT_ID ?? 'azm-tenant-12345', 'Content-Type': 'application/json', 'Accept-Language': 'ar-SA' },
    data: { Email: process.env.ESTATE_MANAGER_EMAIL ?? 'demo-estate-manager@azm.sa', Password: process.env.ESTATE_MANAGER_PASSWORD ?? 'Azm@123' },
  });
  const body = JSON.parse(await res.text());
  const token = body?.data?.accessToken ?? '';
  await ctx.dispose();

  if (!token) throw new Error(`Estate Manager login failed: ${JSON.stringify(body).substring(0, 200)}`);
  console.log('[browser-auth] OK Estate Manager token obtained');
  _emToken = token;
  return token;
}

export async function closeBrowser() { /* no browser to close */ }
