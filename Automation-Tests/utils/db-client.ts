import { createHash } from 'node:crypto';
import { Parser } from 'node-sql-parser';

/**
 * DB verification client for the Playwright suite — relays queries through the
 * CloudBeaver web app's GraphQL API instead of connecting to Postgres directly.
 *
 * Why: the QA/CIT Postgres instance is VPC/IP-restricted and unreachable from a normal
 * dev machine or CI runner (confirmed via direct TCP connection attempts timing out).
 * CloudBeaver (`https://d-infath-db.azm-cit.com`) already runs somewhere with real
 * network access to that DB and is reachable over plain HTTPS, so it's used as a relay:
 * we log into it exactly like the browser does, then drive its SQL-execution API.
 *
 * Read this before using `query()`:
 *
 * 1. **Shared admin identity.** Every query executes as the `CB_USERNAME` CloudBeaver
 *    account (an ADMINISTRATOR-role account) — CloudBeaver's own audit log will show
 *    that account, not the individual engineer or CI job that ran the test.
 * 2. **Only SELECT and UPDATE are allowed.** `assertSelectOrUpdate` parses every query
 *    with `node-sql-parser` and rejects anything else — INSERT, DELETE, DROP, TRUNCATE,
 *    ALTER, multi-statement — outright. This is a deliberate, permanent restriction, not
 *    a TODO: test cleanup must use a soft-delete UPDATE (e.g. `SET is_deleted = true`),
 *    never a hard DELETE. See `db-fixture-example.spec.ts` for the pattern.
 * 3. **`params` are NOT server-side bound parameters.** CloudBeaver's query-execution API
 *    has no placeholder-binding concept (it's built for a human pasting SQL into an
 *    editor) — `$1, $2, ...` placeholders are substituted with safely-escaped SQL
 *    literals client-side, in `substituteParams` below, before the query is sent. Only
 *    `string | number | boolean | null` values are supported; anything else throws
 *    rather than risk silently mis-escaping it.
 * 4. **Password hashing is CloudBeaver's protocol, not a security feature.** The
 *    password is MD5-hashed client-side because that's what CloudBeaver's own web
 *    client does before calling `authLogin` — confirmed by inspecting a real browser
 *    login request. It has nothing to do with how the password is actually stored.
 * 5. **Result values are mostly strings, not native JS types.** CloudBeaver's result-set
 *    serialization returns `null` and booleans as native JSON, but numbers, dates, and
 *    everything else as strings (confirmed empirically — `SELECT 1` comes back as the
 *    string `"1"`, not the number `1`). This client deliberately does NOT try to guess
 *    and auto-coerce numeric-looking strings back into numbers: a text column holding
 *    something like a phone number or national ID can look numeric and would have its
 *    leading zero silently eaten by a wrong guess. Compare against strings in test
 *    assertions (e.g. `expect(row.entity_type).toBe('1')`), or `Number(...)`/`Boolean(...)`
 *    the specific field yourself when you know it's safe to.
 */

const parser = new Parser();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env and fill in ` +
        `real values, or export it in your shell before running the suite.`,
    );
  }
  return value;
}

// ── Session state (module-level singleton, mirrors the old pg.Pool lifecycle) ────────
let cookies: Map<string, string> = new Map();
let connectionId: string | null = null;
let contextId: string | null = null;

function cookieHeader(): string {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function captureCookies(res: Response): void {
  const setCookies: string[] =
    typeof (res.headers as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : [];

  for (const raw of setCookies) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) {
      cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
}

async function gql(baseUrl: string, query: string, variables?: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${baseUrl}/api/gql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookies.size > 0 ? { Cookie: cookieHeader() } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  captureCookies(res);

  const json = (await res.json()) as { data?: unknown; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`CloudBeaver GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  return json.data;
}

async function login(baseUrl: string): Promise<void> {
  const username = requiredEnv('CB_USERNAME');
  const password = requiredEnv('CB_PASSWORD');
  const passwordHash = createHash('md5').update(password, 'utf8').digest('hex').toUpperCase();

  const data = await gql(
    baseUrl,
    'query authLogin($provider: ID!, $credentials: Object) { authLogin(provider: $provider, credentials: $credentials) { authStatus } }',
    { provider: 'local', credentials: { user: username, password: passwordHash } },
  );

  if (data?.authLogin?.authStatus !== 'SUCCESS') {
    throw new Error(`CloudBeaver login did not succeed: ${JSON.stringify(data?.authLogin)}`);
  }
}

async function resolveConnectionId(baseUrl: string): Promise<string> {
  if (connectionId) return connectionId;

  const nameHint = requiredEnv('CB_CONNECTION_NAME');
  const data = await gql(baseUrl, 'query { userConnections { id name } }');
  const connections = (data.userConnections ?? []) as Array<{ id: string; name: string }>;
  const match = connections.find((c) => c.name === nameHint || c.name.includes(nameHint));
  if (!match) {
    throw new Error(
      `No CloudBeaver connection matching CB_CONNECTION_NAME="${nameHint}". ` +
        `Available: ${connections.map((c) => c.name).join(', ')}`,
    );
  }
  connectionId = match.id;
  return connectionId;
}

async function ensureContext(baseUrl: string): Promise<string> {
  if (contextId) return contextId;

  const connId = await resolveConnectionId(baseUrl);
  const database = requiredEnv('CB_DATABASE');
  const data = await gql(
    baseUrl,
    'mutation sqlContextCreate($connectionId: ID!, $defaultCatalog: String) { sqlContextCreate(connectionId: $connectionId, defaultCatalog: $defaultCatalog) { id } }',
    { connectionId: connId, defaultCatalog: database },
  );
  contextId = data.sqlContextCreate.id;
  return contextId as string;
}

async function ensureSession(baseUrl: string): Promise<void> {
  if (cookies.size > 0) return;
  await login(baseUrl);
}

/**
 * Rejects anything that isn't exactly one SELECT or UPDATE statement. Uses a real SQL
 * parser (not a keyword/regex check) so comment-based obfuscation or stacked statements
 * can't slip a DROP/DELETE past a naive prefix check.
 */
function assertSelectOrUpdate(sql: string): void {
  let astOrArray: unknown;
  try {
    astOrArray = parser.astify(sql, { database: 'postgresql' });
  } catch {
    throw new Error('SQL failed to parse — refusing to execute');
  }

  const statements = Array.isArray(astOrArray) ? astOrArray : [astOrArray];
  if (statements.length !== 1) {
    throw new Error('Exactly one SQL statement is allowed per query() call');
  }

  const type = (statements[0] as { type?: string }).type?.toLowerCase();
  if (type !== 'select' && type !== 'update') {
    throw new Error(
      `Only SELECT and UPDATE statements are allowed through this client (got "${type}"). ` +
        `INSERT/DELETE/DROP/TRUNCATE/ALTER are intentionally blocked — use a soft-delete ` +
        `UPDATE for test cleanup instead. See Automation-Tests/README.md.`,
    );
  }
}

/** Escapes a single value as a Postgres SQL literal. Throws on unsupported types rather
 * than risk silently mis-escaping something (e.g. arrays, Dates, objects). */
function escapeLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Unsupported numeric parameter: ${value}`);
    return String(value);
  }
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  throw new Error(
    `Unsupported parameter type for CloudBeaver-relay client: ${typeof value}. ` +
      `Only string, number, boolean, and null are supported — pre-format anything else yourself.`,
  );
}

/** Substitutes `$1, $2, ...` placeholders with escaped literals. NOT server-side bound
 * parameters — see the module doc comment above for why, and its limits. */
function substituteParams(sql: string, params: ReadonlyArray<unknown>): string {
  return sql.replace(/\$(\d+)/g, (match, indexStr) => {
    const index = Number(indexStr) - 1;
    if (index < 0 || index >= params.length) {
      throw new Error(`SQL references $${indexStr} but only ${params.length} param(s) were provided`);
    }
    return escapeLiteral(params[index]);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

/**
 * Runs a SELECT or UPDATE against the real DB via the CloudBeaver relay.
 * `params` are substituted as escaped SQL literals — see module doc comment.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = [],
): Promise<QueryResult<T>> {
  assertSelectOrUpdate(sql);
  const finalSql = params.length > 0 ? substituteParams(sql, params) : sql;

  const baseUrl = requiredEnv('CB_BASE_URL');
  await ensureSession(baseUrl);
  const connId = await resolveConnectionId(baseUrl);
  const ctxId = await ensureContext(baseUrl);

  const execData = await gql(
    baseUrl,
    'mutation asyncSqlExecuteQuery($connectionId: ID!, $contextId: ID!, $sql: String!) { asyncSqlExecuteQuery(connectionId: $connectionId, contextId: $contextId, sql: $sql) { id } }',
    { connectionId: connId, contextId: ctxId, sql: finalSql },
  );
  const taskId = execData.asyncSqlExecuteQuery.id as string;

  // The task runs asynchronously server-side; asyncSqlExecuteResults throws a
  // NullValueInNonNullableField GraphQL error if called before it's finished. Poll with
  // backoff on exactly that failure signature — any other error is a real problem
  // (e.g. a genuine SQL error) and must NOT be retried away.
  const maxAttempts = 12;
  let delayMs = 250;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(delayMs);
    try {
      const resultsData = await gql(
        baseUrl,
        'mutation asyncSqlExecuteResults($taskId: ID!) { asyncSqlExecuteResults(taskId: $taskId) { results { resultSet { rows columns { label } } } } }',
        { taskId },
      );
      const resultSet = resultsData?.asyncSqlExecuteResults?.results?.[0]?.resultSet as
        | { rows: unknown[][]; columns: Array<{ label: string }> }
        | undefined;

      if (!resultSet) {
        // No result set (e.g. a successful UPDATE) — treat as a successful, empty query.
        return { rows: [], rowCount: 0 };
      }

      const labels = resultSet.columns.map((c) => c.label);
      const rows = resultSet.rows.map(
        (row) => Object.fromEntries(labels.map((label, i) => [label, row[i]])) as T,
      );
      return { rows, rowCount: rows.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const notReadyYet =
        message.includes('NullValueInNonNullableField') ||
        (message.includes('non null type') && message.includes('SQLExecuteInfo'));
      if (!notReadyYet) {
        throw err;
      }
      delayMs = Math.min(delayMs * 1.5, 2_000);
    }
  }

  throw new Error(`CloudBeaver query task ${taskId} did not complete after ${maxAttempts} polling attempts`);
}

/** Clears cached session/connection/context state. Called once from global teardown —
 * there's no literal TCP pool to close with this relay, but the name is kept for
 * interface compatibility with the previous pg-based client. */
export async function closePool(): Promise<void> {
  cookies = new Map();
  connectionId = null;
  contextId = null;
}
