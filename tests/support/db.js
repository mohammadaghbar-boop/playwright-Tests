// Shared CloudBeaver DB access for assertions against the application Postgres DB.
// Handles: the "Installing…" splash, Settings→Login, auto-detecting the live PostgreSQL
// connection (its id changes on every CloudBeaver redeploy), and an async SQL runner.

const DB_BASE    = 'https://d-infath-db.azm-cit.com';
const PG_CATALOG = 'Azm_JointFunds';
const CB_USER    = 'cbadmin';
const CB_PASS    = 'Admin@123';

async function gql(page, body, timeoutMs = 60000) {
  const r = await page.request.post(`${DB_BASE}/api/gql`, {
    headers: { 'Content-Type': 'application/json' },
    data:    JSON.stringify(body),
    timeout: timeoutMs,
  });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

/**
 * Open an authenticated CloudBeaver session in its own browser context and return a
 * handle exposing `sql(query)`. Throws if no reachable PostgreSQL connection is found.
 */
async function openDb(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${DB_BASE}/#/`, { waitUntil: 'networkidle', timeout: 40000 });

  // "Installing… 0%" splash renders for a few seconds before the real UI.
  for (let i = 0; i < 30; i++) {
    const body = await page.locator('body').innerText().catch(() => '');
    if (body && !body.includes('Installing')) break;
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(1500);

  // Log in if not already authenticated (Settings gear → Login → credentials).
  let who = await gql(page, { query: `{ activeUser { userId } }` });
  if (!who?.data?.activeUser?.userId || who.data.activeUser.userId === '@anonymous@') {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.locator('button[title="Settings"], button[aria-label="Settings"]').first().click({ timeout: 20000 });
        await page.waitForTimeout(1000);
        await page.locator('text=Login').first().click({ timeout: 8000 });
        await page.waitForSelector('input[name="user"]', { timeout: 12000 });
        await page.locator('input[name="user"]').fill(CB_USER);
        await page.locator('input[name="password"]').fill(CB_PASS);
        await page.locator('input[name="password"]').press('Enter');
        await page.waitForTimeout(3500);
        who = await gql(page, { query: `{ activeUser { userId } }` });
        if (who?.data?.activeUser?.userId && who.data.activeUser.userId !== '@anonymous@') break;
      } catch { await page.waitForTimeout(2000); }
    }
  }

  // Auto-detect the live PostgreSQL connection (id changes on every redeploy).
  const conns = await gql(page, { query: `{ userConnections { id name projectId driverId } }` });
  const pg = (conns?.data?.userConnections || []).find(
    c => /postgre/i.test(c.driverId || '') || /postgre/i.test(c.name || '')
  );
  if (!pg) throw new Error(`No PostgreSQL connection in CloudBeaver. Connections: ${JSON.stringify(conns?.data?.userConnections)}`);

  const state = { connId: pg.id, projectId: pg.projectId, ctxId: null };
  for (let attempt = 0; attempt < 6 && !state.ctxId; attempt++) {
    await gql(page, { query: `mutation { initConnection(id: "${state.connId}", projectId: "${state.projectId}") { connected } }` }).catch(() => {});
    const ctx = await gql(page, {
      query: `mutation { sqlContextCreate(connectionId: "${state.connId}", projectId: "${state.projectId}", defaultCatalog: "${PG_CATALOG}", defaultSchema: "cases") { id } }`,
    });
    state.ctxId = ctx?.data?.sqlContextCreate?.id;
    if (!state.ctxId) await page.waitForTimeout(5000);
  }
  if (!state.ctxId) throw new Error('Failed to create SQL context (connection unreachable)');

  async function sql(query) {
    const exec = await gql(page, {
      query: `mutation Q($c: ID!, $x: ID!, $s: String!) { asyncSqlExecuteQuery(connectionId: $c, contextId: $x, sql: $s) { id } }`,
      variables: { c: state.connId, x: state.ctxId, s: query },
    });
    const taskId = exec?.data?.asyncSqlExecuteQuery?.id;
    if (!taskId) throw new Error(`SQL submit failed: ${JSON.stringify(exec?.errors)}`);
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1500);
      const p = await gql(page, { query: `mutation { asyncTaskInfo(id: "${taskId}", removeOnFinish: false) { running error { message } } }` });
      const t = p?.data?.asyncTaskInfo;
      if (t?.error?.message) throw new Error(`SQL error: ${t.error.message}`);
      if (!t?.running) break;
    }
    const res = await gql(page, {
      query: `mutation R($t: ID!) { asyncSqlExecuteResults(taskId: $t) { results { resultSet { columns { name } rows } } } }`,
      variables: { t: taskId },
    });
    const rs = res?.data?.asyncSqlExecuteResults?.results?.[0]?.resultSet;
    if (!rs) return [];
    const cols = rs.columns.map(c => c.name.replace(/^"|"$/g, ''));
    return rs.rows.map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
  }

  async function close() {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }

  return { page, sql, close, get connId() { return state.connId; }, get ctxId() { return state.ctxId; } };
}

module.exports = { openDb, PG_CATALOG };
