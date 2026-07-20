import { createHash } from 'node:crypto';

/**
 * DB VERIFICATION helper (read-only) for the regression pack.
 *
 * Relays SELECTs through the CloudBeaver web API (https://d-infath-db.azm-cit.com) the
 * same way the team suite's Automation-Tests/utils/db-client.ts does — the CIT Postgres
 * is VPC-restricted and only reachable via that relay. This copy is SELF-CONTAINED so the
 * pack stays standalone, and it is **verification-only: SELECT statements exclusively**
 * (no UPDATE/INSERT/DELETE) — a regression pack observes state, it never mutates it here.
 *
 * ENV-GATED: needs CB_BASE_URL, CB_USERNAME, CB_PASSWORD, CB_CONNECTION_NAME, CB_DATABASE.
 * When any is missing, `dbAvailable()` is false and DB-verification steps `test.skip()`
 * cleanly — so the pack runs everywhere and the DB layer activates the moment creds exist.
 */

export function dbAvailable(): boolean {
  return ['CB_BASE_URL', 'CB_USERNAME', 'CB_PASSWORD', 'CB_CONNECTION_NAME', 'CB_DATABASE'].every(
    (k) => !!process.env[k],
  );
}

let cookies = new Map<string, string>();
let connectionId: string | null = null;
let contextId: string | null = null;

const cookieHeader = () => [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

function captureCookies(res: Response): void {
  const getter = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getter === 'function' ? getter.call(res.headers) : res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : [];
  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

async function gql(baseUrl: string, query: string, variables?: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${baseUrl}/api/gql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookies.size ? { Cookie: cookieHeader() } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  captureCookies(res);
  const json = (await res.json()) as { data?: any; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`CloudBeaver GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
  return json.data;
}

async function login(baseUrl: string): Promise<void> {
  const passwordHash = createHash('md5').update(process.env.CB_PASSWORD!, 'utf8').digest('hex').toUpperCase();
  const data = await gql(
    baseUrl,
    'query authLogin($provider: ID!, $credentials: Object) { authLogin(provider: $provider, credentials: $credentials) { authStatus } }',
    { provider: 'local', credentials: { user: process.env.CB_USERNAME, password: passwordHash } },
  );
  if (data?.authLogin?.authStatus !== 'SUCCESS') throw new Error(`CloudBeaver login failed: ${JSON.stringify(data?.authLogin)}`);
}

async function ensureContext(baseUrl: string): Promise<{ connId: string; ctxId: string }> {
  if (!cookies.size) await login(baseUrl);
  if (!connectionId) {
    const nameHint = process.env.CB_CONNECTION_NAME!;
    const data = await gql(baseUrl, 'query { userConnections { id name } }');
    const conns = (data.userConnections ?? []) as Array<{ id: string; name: string }>;
    const match = conns.find((c) => c.name === nameHint || c.name.includes(nameHint));
    if (!match) throw new Error(`No CloudBeaver connection matching CB_CONNECTION_NAME="${nameHint}"`);
    connectionId = match.id;
  }
  if (!contextId) {
    const data = await gql(
      baseUrl,
      'mutation ctx($connectionId: ID!, $defaultCatalog: String) { sqlContextCreate(connectionId: $connectionId, defaultCatalog: $defaultCatalog) { id } }',
      { connectionId, defaultCatalog: process.env.CB_DATABASE },
    );
    contextId = data.sqlContextCreate.id;
  }
  return { connId: connectionId!, ctxId: contextId! };
}

function assertSelectOnly(sql: string): void {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  if (/;/.test(trimmed)) throw new Error('Only a single statement is allowed');
  if (!/^select\s/i.test(trimmed) && !/^with\s/i.test(trimmed)) {
    throw new Error('DB-verification helper is SELECT-only (the pack never mutates the DB)');
  }
}

function escapeLiteral(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('bad number param'); return String(v); }
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  throw new Error(`Unsupported param type: ${typeof v}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface QueryResult<T = Record<string, unknown>> { rows: T[]; rowCount: number; }

/** Run a SELECT via the relay. Values come back as strings (CloudBeaver serialization) —
 *  compare against strings in assertions. Throws if creds are absent (guard with dbAvailable). */
export async function dbQuery<T = Record<string, unknown>>(sql: string, params: ReadonlyArray<unknown> = []): Promise<QueryResult<T>> {
  if (!dbAvailable()) throw new Error('DB not available — guard DB steps with dbAvailable()/test.skip');
  assertSelectOnly(sql);
  const finalSql = params.length ? sql.replace(/\$(\d+)/g, (_m, i) => escapeLiteral(params[Number(i) - 1])) : sql;
  const baseUrl = process.env.CB_BASE_URL!;
  const { connId, ctxId } = await ensureContext(baseUrl);
  const exec = await gql(
    baseUrl,
    'mutation e($connectionId: ID!, $contextId: ID!, $sql: String!) { asyncSqlExecuteQuery(connectionId: $connectionId, contextId: $contextId, sql: $sql) { id } }',
    { connectionId: connId, contextId: ctxId, sql: finalSql },
  );
  const taskId = exec.asyncSqlExecuteQuery.id as string;
  let delay = 250;
  for (let attempt = 0; attempt < 12; attempt++) {
    await sleep(delay);
    try {
      const data = await gql(
        baseUrl,
        'mutation r($taskId: ID!) { asyncSqlExecuteResults(taskId: $taskId) { results { resultSet { rows columns { label } } } } }',
        { taskId },
      );
      const rs = data?.asyncSqlExecuteResults?.results?.[0]?.resultSet as { rows: unknown[][]; columns: Array<{ label: string }> } | undefined;
      if (!rs) return { rows: [], rowCount: 0 };
      const labels = rs.columns.map((c) => c.label);
      const rows = rs.rows.map((row) => Object.fromEntries(labels.map((l, i) => [l, row[i]])) as T);
      return { rows, rowCount: rows.length };
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      if (!(m.includes('NullValueInNonNullableField') || (m.includes('non null type') && m.includes('SQLExecuteInfo')))) throw err;
      delay = Math.min(delay * 1.5, 2000);
    }
  }
  throw new Error(`CloudBeaver query ${taskId} did not complete`);
}

export function resetDbSession(): void {
  cookies = new Map();
  connectionId = null;
  contextId = null;
}
