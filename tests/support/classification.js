// Shared helpers for JF-171 inheritance-classification assertions.
// DB-reading helpers take a `db` handle (from support/db.js openDb) and use db.sql().

const { expect } = require('@playwright/test');

/** Resolve referral → court_case_id (referral processing is normally sub-second). Returns id or null. */
async function getCaseId(db, referralNum, attempts = 8, delayMs = 5000) {
  for (let i = 0; i < attempts; i++) {
    const rows = await db.sql(
      `SELECT court_case_id FROM cases.referral_requests WHERE internal_referral_number = '${referralNum}'`
    );
    if (rows.length > 0 && rows[0].court_case_id) return String(rows[0].court_case_id);
    await db.page.waitForTimeout(delayMs);
  }
  return null;
}

/** Poll a single case until classified. Returns the row or null on timeout. */
async function waitForClassification(db, caseId, timeoutMs = 140000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await db.sql(
      `SELECT classification, classification_result, total_classification_score, criterion_breakdown_json, rank
       FROM cases.court_cases WHERE id = '${caseId}'`
    );
    if (rows.length > 0 && rows[0].total_classification_score !== null) return rows[0];
    await db.page.waitForTimeout(6000);
  }
  return null;
}

async function getAssets(db, caseId) {
  return db.sql(
    `SELECT a.id, a.status, a.asset_type, a.estimated_value, a.real_estate_type_name
     FROM cases.assets a JOIN cases.asset_links al ON al.asset_id = a.id
     WHERE al.case_id = '${caseId}'`
  );
}

async function getCaseEvents(db, caseId) {
  return db.sql(
    `SELECT event_type, event_name_ar, event_name_en, status_at_event, new_status, metadata, created_at
     FROM cases.case_events WHERE case_id = '${caseId}' ORDER BY created_at DESC`
  );
}

// case_events has no single "detail" column — combine the fields carrying event text/context.
function eventText(e) {
  return [e?.event_name_ar, e?.event_name_en, e?.new_status, e?.metadata]
    .filter(Boolean).map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' | ');
}

// criterion_breakdown_json is a PascalCase array wrapped by CloudBeaver as {$type:content,text}.
// Parse into a map keyed by criterion Key with normalized numeric fields.
function breakdown(caseRow) {
  try {
    let raw = caseRow?.criterion_breakdown_json;
    if (!raw) return null;
    if (typeof raw === 'object' && raw.text !== undefined) raw = raw.text;
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return null;
    const map = {};
    for (const c of arr) {
      const key = c.Key ?? c.key;
      if (!key) continue;
      map[key] = {
        rawValue:        Number(c.RawValue        ?? c.rawValue),
        normalizedScore: Number(c.NormalizedScore ?? c.normalizedScore),
        weightedScore:   Number(c.WeightedScore   ?? c.weightedScore),
        effectiveWeight: Number(c.EffectiveWeight ?? c.effectiveWeight),
      };
    }
    return map;
  } catch { return null; }
}

function crit(caseRow, key) {
  const bd = breakdown(caseRow);
  return bd ? bd[key] : null;
}

// JF-171 band tables (RawValue → normalized band).
const BAND_TABLES = {
  classifiedAssetsCount: v => (v <= 3 ? 0 : v <= 6 ? 25 : v <= 9 ? 50 : v <= 13 ? 75 : 100),
  movablesCount:         v => (v <= 0 ? 0 : v <= 2 ? 25 : v <= 5 ? 50 : v <= 8 ? 75 : 100),
  heirsCount:            v => (v <= 3 ? 0 : v <= 6 ? 25 : v <= 9 ? 50 : v <= 13 ? 75 : 100),
  estimatedValueImpact:  v => (v < 500000 ? 0 : v < 900000 ? 25 : v < 1500000 ? 50 : v < 3000000 ? 75 : 100),
  estateOutsideKingdom:  v => (v >= 1 ? 100 : 0),
};
const VALID_NORMALIZED = [0, 25, 50, 75, 100];

function expectedBand(key, rawValue) {
  const fn = BAND_TABLES[key];
  return fn ? fn(Number(rawValue)) : null;
}

/** Assert a criterion maps its raw value to the correct band and WeightedScore = Normalized × weight. */
function assertCriterionConsistent(caseRow, key) {
  const c = crit(caseRow, key);
  expect(c, `criterion "${key}" missing from breakdown`).toBeTruthy();
  expect(VALID_NORMALIZED, `${key} NormalizedScore ${c.normalizedScore} not a valid band value`).toContain(c.normalizedScore);
  const want = expectedBand(key, c.rawValue);
  if (want !== null) {
    expect(c.normalizedScore, `${key}: RawValue ${c.rawValue} should map to band ${want}, got ${c.normalizedScore}`).toBe(want);
  }
  const expectedWeighted = c.normalizedScore * c.effectiveWeight;
  expect(Math.abs(c.weightedScore - expectedWeighted),
    `${key}: WeightedScore ${c.weightedScore} ≠ NormalizedScore ${c.normalizedScore} × weight ${c.effectiveWeight}`
  ).toBeLessThan(0.5);
  return c;
}

/** Assert scoring math + rank mapping: weights sum ≈ 1, total = Σ weighted, rank matches score band. */
function assertScoringConsistent(label, caseRow) {
  const bd = breakdown(caseRow);
  expect(bd, `${label}: no breakdown`).toBeTruthy();
  const crits = Object.values(bd);
  const weightSum = crits.reduce((s, c) => s + c.effectiveWeight, 0);
  expect(Math.abs(weightSum - 1), `${label}: weights sum to ${weightSum}, expected ~1.0`).toBeLessThan(0.02);
  const sumWeighted = crits.reduce((s, c) => s + c.weightedScore, 0);
  const total = Number(caseRow.total_classification_score);
  expect(Math.abs(total - sumWeighted), `${label}: total ${total} ≠ Σ weighted ${sumWeighted.toFixed(2)}`).toBeLessThan(0.5);
  const rank = String(caseRow.rank).toUpperCase();
  const expectedRank = total >= 76 ? 'A' : total >= 56 ? 'B' : total >= 31 ? 'C' : 'D';
  expect(rank, `${label}: rank ${rank} does not match score ${total} (expected ${expectedRank})`).toBe(expectedRank);
  return { total, rank, weightSum };
}

module.exports = {
  getCaseId, waitForClassification, getAssets, getCaseEvents, eventText,
  breakdown, crit, BAND_TABLES, VALID_NORMALIZED, expectedBand,
  assertCriterionConsistent, assertScoringConsistent,
};
