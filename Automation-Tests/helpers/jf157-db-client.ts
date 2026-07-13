/**
 * DB client -- executes SQL via CloudBeaver's GraphQL API.
 * Session cookie is obtained automatically via browser automation (browser-auth.ts).
 */

import * as https from 'https';
import * as dotenv from 'dotenv';
dotenv.config();

const CB_HOST = 'd-infath-db.azm-cit.com';
const SCHEMA  = process.env.DB_SCHEMA ?? 'cases';

// -- Shared state -------------------------------------------------------
let _connId: string | null = null;
let _ctxId:  string | null = null;
let _cookie: string = process.env.CB_SESSION_ID ? `cb-session-id=${process.env.CB_SESSION_ID}` : '';

/** Called by test beforeAll to inject the browser-obtained session cookie.
 *  Accepts either the raw session ID value or a full cookie header string. */
export function setCbSessionCookie(cookieOrSessionId: string) {
  _cookie = cookieOrSessionId.includes('=') ? cookieOrSessionId : `cb-session-id=${cookieOrSessionId}`;
  _connId = null;
  _ctxId  = null;
}

// -- HTTP helper --------------------------------------------------------
const agent = new https.Agent({ rejectUnauthorized: false });

async function gql(queryStr: string, retries = 4): Promise<any> {
  const body = JSON.stringify({ query: queryStr });
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const req = https.request({
          hostname: CB_HOST, path: '/api/gql', method: 'POST', agent,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            ...(_cookie ? { Cookie: _cookie } : {}),
          },
        }, res => {
          let data = '';
          const newCookies = (res.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]);
          if (newCookies.length) _cookie = newCookies.join('; ');
          res.on('data', (d: Buffer) => data += d);
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 500) {
              reject(new Error(`CB_HTTP_${res.statusCode}`));
              return;
            }
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error(`CloudBeaver non-JSON: ${data.substring(0, 200)}`)); }
          });
        });
        // No timeout was set here previously -- a stalled CIT relay connection (no response,
        // no socket error) left the request pending forever with zero output, indistinguishable
        // from "still working." Confirmed by repeated real hangs during CIT runs. 20s is well
        // above CloudBeaver's normal sub-second response time.
        req.setTimeout(20_000, () => req.destroy(new Error('CB_TIMEOUT')));
        req.on('error', reject);
        req.write(body);
        req.end();
      });
      return result;
    } catch (err: any) {
      if (attempt < retries && (err.message?.startsWith('CB_HTTP_5') || err.message?.includes('ECONNRESET') || err.message?.includes('CB_TIMEOUT'))) {
        console.warn(`[DB] CloudBeaver ${err.message} -- retry ${attempt + 1}/${retries} in 3s`);
        _connId = null; _ctxId = null;
        await sleep(3000);
        continue;
      }
      throw err;
    }
  }
}

// -- Session bootstrap --------------------------------------------------

async function ensureSession(): Promise<void> {
  if (_connId && _ctxId) return;

  // If no cookie yet, it must be set via setCbSessionCookie() before first query
  if (!_cookie) {
    throw new Error(
      'CloudBeaver session not initialised.\n' +
      'Ensure browser-auth.ts getCloudBeaverSession() is called in beforeAll.'
    );
  }

  // Do NOT call openSession — it creates a new anonymous session and
  // would replace the authenticated cookie. Use the cookie directly.

  // Get connections
  const conns = await gql('{ userConnections { id name } }');
  const list: any[] = conns.data?.userConnections ?? [];

  if (!list.length) {
    throw new Error(
      'CloudBeaver: no connections available.\n' +
      'The session cookie may have expired -- re-run to obtain a fresh one.'
    );
  }

  const conn = list.find((c: any) =>
    c.name?.toLowerCase().includes('postgresql') ||
    c.name?.toLowerCase().includes('postgres') ||
    c.name?.toLowerCase().includes('joint') ||
    c.name?.toLowerCase().includes('azm')
  ) ?? list.find((c: any) => !c.name?.toLowerCase().includes('sql server')) ?? list[0];

  _connId = conn.id;

  // Init the connection
  await gql(`mutation { initConnection(id: "${_connId}") { id connected } }`);

  // Create SQL context with correct catalog/schema
  const catalog = process.env.DB_CATALOG ?? 'Azm_JointFunds';
  const ctx = await gql(
    `mutation { sqlContextCreate(connectionId: "${_connId}", defaultCatalog: "${catalog}", defaultSchema: "${SCHEMA}") { id } }`
  );
  _ctxId = ctx.data?.sqlContextCreate?.id ?? null;

  if (!_ctxId) throw new Error('CloudBeaver: failed to create SQL context');

  // Set search_path to ensure schema-qualified queries resolve
  const setStart = await gql(
    `mutation { asyncSqlExecuteQuery(connectionId: "${_connId}", contextId: "${_ctxId}", sql: "SET search_path TO ${SCHEMA}, public") { id } }`
  );
  if (!setStart.errors) {
    await sleep(500);
    await gql(`mutation { asyncTaskInfo(id: "${setStart.data?.asyncSqlExecuteQuery?.id}", removeOnFinish: true) { id running } }`);
  }

  // Diagnostic: confirm which DB and whether the cases schema/table exists
  try {
    const diagStart = await gql(
      `mutation { asyncSqlExecuteQuery(connectionId: "${_connId}", contextId: "${_ctxId}", sql: "SELECT current_database() AS db, (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'court_cases') AS cc") { id } }`
    );
    if (!diagStart.errors) {
      await sleep(500);
      await gql(`mutation { asyncTaskInfo(id: "${diagStart.data?.asyncSqlExecuteQuery?.id}", removeOnFinish: true) { id running } }`);
      const diagRes = await gql(
        `mutation { asyncSqlExecuteResults(taskId: "${diagStart.data?.asyncSqlExecuteQuery?.id}") { results { resultSet { columns { name } rows } } } }`
      );
      const rs = diagRes.data?.asyncSqlExecuteResults?.results?.[0]?.resultSet;
      if (rs?.rows?.[0]) {
        const db = rs.rows[0][0];
        const cc = rs.rows[0][1];
        console.log(`[DB diag] database="${db}" court_cases_count=${cc}`);
        if (Number(cc) === 0) {
          console.warn(`[DB diag] WARNING: court_cases table not found in database "${db}". Session may be using wrong DB. Refresh CB_SESSION_ID in .env.`);
        }
      }
    }
  } catch (_) { /* diagnostic failure is non-fatal */ }

  console.log(`OK CloudBeaver connected | conn=${_connId} | ctx=${_ctxId}`);
}

// -- SQL execution ------------------------------------------------------

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  let finalSql = sql;
  params.forEach((p, i) => {
    const val = typeof p === 'string'  ? `'${p.replace(/'/g, "''")}'`
               : typeof p === 'boolean' ? (p ? 'true' : 'false')
               : p === null             ? 'NULL'
               : Array.isArray(p)       ? `ARRAY[${(p as string[]).map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]`
               : String(p);
    finalSql = finalSql.split(`$${i + 1}`).join(val);
  });

  await ensureSession();

  const escapedSql = finalSql.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');

  const start = await gql(
    `mutation { asyncSqlExecuteQuery(connectionId: "${_connId}", contextId: "${_ctxId}", sql: "${escapedSql}") { id } }`
  );

  if (start.errors) throw new Error(`CloudBeaver query error: ${start.errors[0].message}`);
  const taskId = start.data?.asyncSqlExecuteQuery?.id;

  for (let i = 0; i < 20; i++) {
    await sleep(300);
    const info = await gql(`mutation { asyncTaskInfo(id: "${taskId}", removeOnFinish: false) { id running status error { message } } }`);
    const task = info.data?.asyncTaskInfo;
    if (task?.error) throw new Error(`CloudBeaver task error: ${task.error.message}`);
    if (!task?.running) break;
  }

  const res = await gql(
    `mutation { asyncSqlExecuteResults(taskId: "${taskId}") { results { resultSet { columns { name } rows } } } }`
  );

  if (res.errors) throw new Error(`CloudBeaver fetch error: ${res.errors[0].message}`);

  const resultSet = res.data?.asyncSqlExecuteResults?.results?.[0]?.resultSet;
  return parseResultSet(resultSet) as T[];
}

function parseResultSet(resultSet: any): Record<string, unknown>[] {
  if (!resultSet) return [];
  const cols: string[] = (resultSet.columns || []).map((c: any) => {
    const name: string = c.name ?? '';
    // CloudBeaver wraps column names in double-quotes -- strip them
    return name.startsWith('"') && name.endsWith('"') ? name.slice(1, -1) : name;
  });
  const rows: any[][] = resultSet.rows || [];
  return rows.map((row: any[]) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      let val = row[i];
      // CloudBeaver wraps JSON/JSONB columns as {$type:'content', text:'...'}
      if (val && typeof val === 'object' && (val as any).$type === 'content' && typeof (val as any).text === 'string') {
        const text = (val as any).text as string;
        try { val = JSON.parse(text); } catch { val = text; }
      }
      obj[col] = val ?? null;
    });
    return obj;
  });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// -- Close --------------------------------------------------------------

export async function closeDb() {
  if (_connId && _ctxId) {
    try { await gql(`mutation { sqlContextDestroy(connectionId: "${_connId}", contextId: "${_ctxId}") }`); } catch {}
  }
  _connId = null;
  _ctxId  = null;
}

// -- Domain helpers -----------------------------------------------------

export async function getCaseId(referralId: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const rows = await query<{ id: string }>(
      'SELECT id FROM cases.court_cases WHERE referral_request_id = $1', [referralId]
    );
    if (rows.length) return rows[0].id;
    await sleep(1000);
  }
  throw new Error(`No court_case found after 30s for referralId=${referralId}`);
}

export interface SamaRecord { inquiry_type: number; msg_uid: string }
export async function getSamaCorrelationIds(caseId: string): Promise<SamaRecord[]> {
  for (let attempt = 0; attempt < 60; attempt++) {   // wait up to 30s
    const rows = await query<SamaRecord>(`
      SELECT inquiry_type::int AS inquiry_type, msg_uid
      FROM cases.sama_inquiry_records
      WHERE court_case_id = $1
        AND msg_uid IS NOT NULL
        AND msg_uid <> ''
      ORDER BY inquiry_type ASC, created_at DESC`,
      [caseId]
    );
    const seen = new Set<number>();
    const deduped = rows.filter(r => {
      const t = Number(r.inquiry_type);
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
    if (deduped.length >= 5) return deduped.slice(0, 5);
    await sleep(500);
  }
  const rows = await query<SamaRecord>(
    'SELECT DISTINCT inquiry_type::int AS inquiry_type, msg_uid FROM cases.sama_inquiry_records WHERE court_case_id = $1 ORDER BY inquiry_type',
    [caseId]
  );
  return rows;
}

export async function getCmaNafithNumber(caseId: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const rows = await query<{ nafith_number: string }>(
      'SELECT nafith_number FROM cases.cma_inquiry_records WHERE court_case_id = $1 ORDER BY created_at DESC LIMIT 1',
      [caseId]
    );
    if (rows.length && rows[0].nafith_number) return rows[0].nafith_number;
    await sleep(500);
  }
  throw new Error(`No CMA record found after 20s for caseId=${caseId}`);
}

export interface AssetRow {
  asset_number: string;
  type_id: number;
  status: number;
  result: number | null;
  failed_criteria_codes_json: string;
}

export async function getAssets(caseId: string): Promise<AssetRow[]> {
  const rows = await query<Record<string, unknown>>(`
    SELECT
      a.asset_number,
      a.asset_type::int            AS type_id,
      a.status::int                AS status,
      arr.result::int              AS result,
      COALESCE(arr.failed_criteria_codes_json, '[]') AS failed_criteria_codes_json
    FROM cases.asset_readiness_results arr
    JOIN cases.asset_readiness_runs ar ON ar.id = arr.asset_readiness_run_id
    JOIN cases.assets a ON a.id = arr.asset_id
    WHERE ar.court_case_id = $1`,
    [caseId]
  );
  return rows.map(r => {
    const failed = r.failed_criteria_codes_json;
    let failedStr: string;
    if (failed == null) failedStr = '[]';
    else if (typeof failed === 'string') failedStr = failed;
    else failedStr = JSON.stringify(failed);
    return {
      asset_number:              String(r.asset_number ?? ''),
      type_id:                   Number(r.type_id ?? 0),
      status:                    Number(r.status ?? 0),
      result:                    r.result != null ? Number(r.result) : null,
      failed_criteria_codes_json: failedStr,
    };
  });
}

export async function getRunCount(caseId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*) AS count FROM cases.asset_readiness_runs WHERE court_case_id = $1', [caseId]
  );
  return parseInt(rows[0]?.count ?? '0');
}

/** Single-query poll state — replaces 3 separate CloudBeaver roundtrips in polling loops */
export async function getPollState(caseId: string): Promise<{ assetStatus: number; wr: number | null; runs: number }> {
  const rows = await query<Record<string, unknown>>(`
    SELECT
      (SELECT COALESCE(MIN(a.status::int), 8)
       FROM cases.asset_readiness_results arr
       JOIN cases.asset_readiness_runs ar ON ar.id = arr.asset_readiness_run_id
       JOIN cases.assets a ON a.id = arr.asset_id
       WHERE ar.court_case_id = $1) AS asset_min_status,
      (SELECT result FROM cases.work_requirements_validation_results
       WHERE court_case_id = $1 ORDER BY created_at DESC LIMIT 1) AS wr_result,
      (SELECT COUNT(*) FROM cases.asset_readiness_runs WHERE court_case_id = $1) AS run_count`,
    [caseId]
  );
  const r = rows[0] ?? {};
  return {
    assetStatus: Number(r.asset_min_status ?? 8),
    wr:          r.wr_result != null ? Number(r.wr_result) : null,
    runs:        Number(r.run_count ?? 0),
  };
}

export async function getRunLog(caseId: string): Promise<{ count: number; asset_count: number }> {
  const rows = await query<{ cnt: string; asset_count: number }>(
    'SELECT COUNT(*) AS cnt, COALESCE(MAX(asset_count), 0) AS asset_count FROM cases.asset_readiness_runs WHERE court_case_id = $1',
    [caseId]
  );
  return { count: parseInt(rows[0]?.cnt ?? '0'), asset_count: Number(rows[0]?.asset_count ?? 0) };
}

export async function getWorkRequirementsResult(caseId: string): Promise<number | null> {
  const rows = await query<Record<string, unknown>>(
    'SELECT result FROM cases.work_requirements_validation_results WHERE court_case_id = $1 ORDER BY created_at DESC LIMIT 1',
    [caseId]
  );
  const val = rows[0]?.result;
  return val != null ? Number(val) : null;
}

export async function setCriteriaActive(codes: string[], active: boolean) {
  await query(
    `UPDATE cases.preliminary_readiness_criteria SET is_active = $1 WHERE code = ANY($2)`,
    [active, codes]
  );
}

export async function setAllCriteriaActive(active: boolean) {
  await query('UPDATE cases.preliminary_readiness_criteria SET is_active = $1', [active]);
}

export async function forceCmaStatus(caseId: string, status: number) {
  await query('UPDATE cases.cma_inquiry_records SET status = $1 WHERE court_case_id = $2', [status, caseId]);
}

export async function forceAllSamaSucceeded(caseId: string) {
  // SAMA status 5 = Succeeded
  await query(
    `UPDATE cases.sama_inquiry_records SET status = 5, callback_received_at = NOW() WHERE court_case_id = $1`,
    [caseId]
  );
}

export async function forceCmaSucceeded(caseId: string) {
  await query(
    `UPDATE cases.cma_inquiry_records SET status = 3, callback_received_at = NOW() WHERE court_case_id = $1`,
    [caseId]
  );
}

export async function forceDeedInquirySucceeded(caseId: string) {
  await query(
    `UPDATE cases.deed_inquiry_records
     SET status = 3, is_deed_obselete = false,
         is_real_estate_mortgaged = false, is_real_estate_halted = false,
         is_real_estate_testamented = false, is_real_estate_constrained = false
     WHERE court_case_id = $1`,
    [caseId]
  );
}

export async function fixSaleAuthority(caseId: string) {
  await query(
    `UPDATE cases.referral_requests
     SET decree_data_json = jsonb_set(
       decree_data_json::jsonb,
       '{liquidationCenter,authorities}',
       '[{"id": 1, "description": "بيع وتصفية وقسمة التركة"}]'::jsonb
     )
     WHERE court_case_id = $1`,
    [caseId]
  );
}

export async function setRealEstateAssetCriteria(caseId: string) {
  await query(
    `UPDATE cases.assets
     SET real_estate_type_name = 'أرض خام',
         is_mortgaged = false, is_constrained = false,
         is_testamented = false, is_halted = false
     WHERE id IN (
       SELECT a.id FROM cases.assets a
       JOIN cases.asset_links al ON al.asset_id = a.id
       WHERE al.case_id = $1 AND a.asset_type = '1'
     )`,
    [caseId]
  );
}

export async function forceWorkRequirementsApproved(caseId: string) {
  await query(`
    INSERT INTO cases.work_requirements_validation_results
      (id, court_case_id, result, failed_reasons_json, route_target, system_source,
       evaluated_at, correlation_id, created_at, created_by, updated_at, updated_by, is_deleted)
    VALUES (gen_random_uuid(), $1, 1, '[]', 'AssetReadinessClassification',
       'INHERITANCE_WORK_REQUIREMENTS_VALIDATION', NOW(), gen_random_uuid(),
       NOW(), '00000000-0000-0000-0000-000000000000',
       NOW(), '00000000-0000-0000-0000-000000000000', false)
    ON CONFLICT DO NOTHING`,
    [caseId]
  );
}

/** Set real_estate_type_name on real-estate assets (asset_type='1') for a case. Used by TC-009. */
export async function setRealEstateTypeName(caseId: string, typeName: string) {
  // Update cases.assets
  const r1 = await query<{count: string}>(
    `UPDATE cases.assets SET real_estate_type_name = $1
     WHERE id IN (
       SELECT a.id FROM cases.assets a
       JOIN cases.asset_links al ON al.asset_id = a.id
       WHERE al.case_id = $2 AND a.asset_type = '1'
     )
     RETURNING id`,
    [typeName, caseId]
  );
  console.log(`[setRealEstateTypeName] updated ${r1.length} asset(s) via asset_links`);

  // Also update deed_real_estate_snapshots (classification may read from here)
  try {
    const r2 = await query<{count: string}>(
      `UPDATE cases.deed_real_estate_snapshots SET real_estate_type_name = $1
       WHERE deed_id IN (
         SELECT d.id FROM cases.deeds d
         JOIN cases.asset_links al ON al.asset_id = d.asset_id
         WHERE al.case_id = $2
       )
       RETURNING id`,
      [typeName, caseId]
    );
    console.log(`[setRealEstateTypeName] updated ${r2.length} deed_real_estate_snapshots row(s)`);
  } catch (e: any) {
    console.warn(`[setRealEstateTypeName] deed_real_estate_snapshots update skipped: ${e.message?.substring(0, 80)}`);
  }
}

export async function nullAssetMortgageField(caseId: string, assetNumber: string) {
  await query(
    `UPDATE cases.assets SET is_mortgaged = NULL
     WHERE id IN (
       SELECT a.id FROM cases.assets a
       JOIN cases.asset_links al ON al.asset_id = a.id
       WHERE al.case_id = $1 AND a.asset_number = $2
     )`,
    [caseId, assetNumber]
  );
}

/**
 * Set a specific inquiry flag to NULL on deed_inquiry_records (simulates missing inquiry data).
 * field names mirror deed_inquiry_records columns: is_real_estate_mortgaged, etc.
 */
export async function nullifyDeedInquiryFlag(
  caseId: string,
  field: 'is_real_estate_mortgaged' | 'is_real_estate_constrained' | 'is_real_estate_testamented' | 'is_real_estate_halted'
) {
  await query(
    `UPDATE cases.deed_inquiry_records SET ${field} = NULL WHERE court_case_id = $1`,
    [caseId]
  );
}

/** Set a single boolean field to NULL on real-estate assets for a case (simulates missing inquiry data) */
export async function nullifyRealEstateAssetField(
  caseId: string,
  field: 'is_mortgaged' | 'is_constrained' | 'is_testamented' | 'is_halted'
) {
  await query(
    `UPDATE cases.assets SET ${field} = NULL
     WHERE id IN (
       SELECT a.id FROM cases.assets a
       JOIN cases.asset_links al ON al.asset_id = a.id
       WHERE al.case_id = $1 AND a.asset_type = '1'
     )`,
    [caseId]
  );
}

/**
 * Insert a second real-estate asset linked to the case.
 * Used by TC-2257 to create a mix of ready and not-ready assets.
 * Returns the new asset id.
 */
export async function addRealEstateAssetToCase(
  caseId: string,
  opts: { deedNumber: string; isConstrained?: boolean }
): Promise<string> {
  const constrained = opts.isConstrained ?? false;
  const rows = await query<{ id: string }>(
    `WITH new_asset AS (
       INSERT INTO cases.assets
         (id, asset_type, status,
          is_mortgaged, is_constrained, is_halted, is_testamented,
          real_estate_type_name, deed_number, asset_number, description, currency,
          created_at, created_by, updated_at, updated_by, is_deleted)
       VALUES
         (gen_random_uuid(), 1, 8,
          false, $1, false, false,
          'أرض خام', $2, $2, 'QA-seeded asset', 'SAR',
          NOW(), '00000000-0000-0000-0000-000000000000',
          NOW(), '00000000-0000-0000-0000-000000000000', false)
       RETURNING id
     )
     INSERT INTO cases.asset_links (link_id, asset_id, case_id, linked_at, linked_by)
     SELECT gen_random_uuid(), id, $3, NOW(), '00000000-0000-0000-0000-000000000000' FROM new_asset
     RETURNING asset_id AS id`,
    [constrained, opts.deedNumber, caseId]
  );
  return rows[0].id;
}

/** Set a single boolean field on real-estate assets for a case.
 *  field must be one of: is_mortgaged, is_constrained, is_testamented, is_halted */
export async function setRealEstateAssetField(
  caseId: string,
  field: 'is_mortgaged' | 'is_constrained' | 'is_testamented' | 'is_halted',
  value: boolean
) {
  await query(
    `UPDATE cases.assets SET ${field} = $1
     WHERE id IN (
       SELECT a.id FROM cases.assets a
       JOIN cases.asset_links al ON al.asset_id = a.id
       WHERE al.case_id = $2 AND a.asset_type = '1'
     )`,
    [value, caseId]
  );
}

/** Get cases.assets.deed_number for the real estate asset (asset_type=1) of a case */
export async function getAssetDeedNumber(caseId: string): Promise<string> {
  const rows = await query<{ deed_number: string }>(
    `SELECT a.deed_number FROM cases.assets a
     JOIN cases.asset_links al ON al.asset_id = a.id
     WHERE al.case_id = $1 AND a.asset_type = 1 AND a.deed_number IS NOT NULL LIMIT 1`,
    [caseId]
  );
  if (!rows.length || !rows[0].deed_number) throw new Error(`No deed_number on RE asset for caseId=${caseId}`);
  return rows[0].deed_number;
}

/**
 * Append a real estate entry to referral_requests.initial_assets_json so
 * UPDATED_DEED_PRESENT sees the deed_number in courtAssetReference.
 */
export async function setCourtAssetReference(caseId: string, deedNumber: string) {
  await query(
    `UPDATE cases.referral_requests
     SET initial_assets_json = COALESCE(initial_assets_json, '[]'::jsonb) ||
       jsonb_build_array(jsonb_build_object(
         'assetTypeId', 'REAL_ESTATE',
         'courtAssetReference', $1::text
       ))
     WHERE court_case_id = $2`,
    [deedNumber, caseId]
  );
}

/** Get the deed_number from a succeeded deed inquiry record for a case */
export async function getDeedInquiryDeedNumber(caseId: string): Promise<string> {
  const rows = await query<{ deed_number: string }>(
    `SELECT deed_number FROM cases.deed_inquiry_records
     WHERE court_case_id = $1 AND deed_number IS NOT NULL AND deed_number <> ''
     ORDER BY created_at DESC LIMIT 1`,
    [caseId]
  );
  if (!rows.length || !rows[0].deed_number) throw new Error(`No deed_number found for caseId=${caseId}`);
  return rows[0].deed_number;
}

/** Get the referral_request UUID for a case (needed for judgment deed path) */
export async function getReferralId(caseId: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM cases.referral_requests WHERE court_case_id = $1 LIMIT 1`,
    [caseId]
  );
  if (!rows.length) throw new Error(`No referral_request found for caseId=${caseId}`);
  return rows[0].id;
}

/**
 * Seed a row into judgment_deed_ingestion.deed_ingestions so UPDATED_DEED_PRESENT passes.
 * status=2 = completed/succeeded.
 * Pass postedReferralId to cover the judgment-deed path (TC-2244).
 */
export async function seedJudgmentDeedIngestion(deedNumber: string, postedReferralId?: string) {
  const referralVal = postedReferralId ? `'${postedReferralId}'` : 'NULL';
  await query(
    `INSERT INTO judgment_deed_ingestion.deed_ingestions
       (id, idempotency_key, court_external_code, status, deed_number, posted_referral_id,
        oss_pdf_ref, oss_raw_text_ref,
        attempt_count, created_at, created_by, updated_at, updated_by, is_deleted)
     VALUES
       (gen_random_uuid(), $1, 'QA-SEED', 2, $1, ${referralVal},
        'QA-SEED', 'QA-SEED',
        1, NOW(), '00000000-0000-0000-0000-000000000000',
        NOW(), '00000000-0000-0000-0000-000000000000', false)
     ON CONFLICT DO NOTHING`,
    [deedNumber]
  );
}

/** Remove seeded deed ingestion rows by deed_number (cleanup after TC-2243/2244) */
export async function deleteSeedDeedIngestion(deedNumber: string) {
  await query(
    `DELETE FROM judgment_deed_ingestion.deed_ingestions WHERE deed_number = $1`,
    [deedNumber]
  );
}

export async function getCaseEvents(caseId: string): Promise<{ event_type: number }[]> {
  const rows = await query<Record<string, unknown>>(
    'SELECT event_type::int AS event_type FROM cases.case_events WHERE case_id = $1 ORDER BY created_at',
    [caseId]
  );
  return rows.map(r => ({ event_type: Number(r.event_type) }));
}
