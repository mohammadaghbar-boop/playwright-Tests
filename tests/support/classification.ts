// Shared helpers for JF-171 inheritance-classification assertions.
// DB-reading helpers take a `db` handle (from support/db.ts openDb) and use db.sql().
import { expect } from '@playwright/test';
import type { DbHandle } from './db';

/** A single parsed criterion from criterion_breakdown_json. */
export interface Criterion {
  rawValue: number;
  normalizedScore: number;
  weightedScore: number;
  effectiveWeight: number;
}

export type Breakdown = Record<string, Criterion>;

/** Loosely-typed court_cases row as returned by CloudBeaver. */
export interface CaseRow {
  classification?: unknown;
  classification_result?: unknown;
  total_classification_score?: unknown;
  criterion_breakdown_json?: unknown;
  rank?: unknown;
  [key: string]: unknown;
}

/** Resolve referral → court_case_id (referral processing is normally sub-second). Returns id or null. */
export async function getCaseId(db: DbHandle, referralNum: string, attempts = 8, delayMs = 5000): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const rows = await db.sql<{ court_case_id: unknown }>(
      `SELECT court_case_id FROM cases.referral_requests WHERE internal_referral_number = '${referralNum}'`,
    );
    if (rows.length > 0 && rows[0].court_case_id) return String(rows[0].court_case_id);
    await db.page.waitForTimeout(delayMs);
  }
  return null;
}

/** Poll a single case until classified. Returns the row or null on timeout. */
export async function waitForClassification(db: DbHandle, caseId: string, timeoutMs = 140000): Promise<CaseRow | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await db.sql<CaseRow>(
      `SELECT classification, classification_result, total_classification_score, criterion_breakdown_json, rank
       FROM cases.court_cases WHERE id = '${caseId}'`,
    );
    if (rows.length > 0 && rows[0].total_classification_score !== null) return rows[0];
    await db.page.waitForTimeout(6000);
  }
  return null;
}

export async function getAssets(db: DbHandle, caseId: string): Promise<Array<Record<string, unknown>>> {
  return db.sql(
    `SELECT a.id, a.status, a.asset_type, a.estimated_value, a.real_estate_type_name
     FROM cases.assets a JOIN cases.asset_links al ON al.asset_id = a.id
     WHERE al.case_id = '${caseId}'`,
  );
}

export interface CaseEvent {
  event_type?: unknown;
  event_name_ar?: unknown;
  event_name_en?: unknown;
  status_at_event?: unknown;
  new_status?: unknown;
  metadata?: unknown;
  created_at?: unknown;
}

export async function getCaseEvents(db: DbHandle, caseId: string): Promise<CaseEvent[]> {
  return db.sql<CaseEvent>(
    `SELECT event_type, event_name_ar, event_name_en, status_at_event, new_status, metadata, created_at
     FROM cases.case_events WHERE case_id = '${caseId}' ORDER BY created_at DESC`,
  );
}

// case_events has no single "detail" column — combine the fields carrying event text/context.
export function eventText(e: CaseEvent | undefined): string {
  return [e?.event_name_ar, e?.event_name_en, e?.new_status, e?.metadata]
    .filter(Boolean)
    .map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v)))
    .join(' | ');
}

// criterion_breakdown_json is a PascalCase array wrapped by CloudBeaver as {$type:content,text}.
// Parse into a map keyed by criterion Key with normalized numeric fields.
export function breakdown(caseRow: CaseRow | null | undefined): Breakdown | null {
  try {
    let raw: any = caseRow?.criterion_breakdown_json;
    if (!raw) return null;
    if (typeof raw === 'object' && raw.text !== undefined) raw = raw.text;
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return null;
    const map: Breakdown = {};
    for (const c of arr) {
      const key = c.Key ?? c.key;
      if (!key) continue;
      map[key] = {
        rawValue: Number(c.RawValue ?? c.rawValue),
        normalizedScore: Number(c.NormalizedScore ?? c.normalizedScore),
        weightedScore: Number(c.WeightedScore ?? c.weightedScore),
        effectiveWeight: Number(c.EffectiveWeight ?? c.effectiveWeight),
      };
    }
    return map;
  } catch {
    return null;
  }
}

export function crit(caseRow: CaseRow, key: string): Criterion | null {
  const bd = breakdown(caseRow);
  return bd ? bd[key] ?? null : null;
}

// JF-171 band tables (RawValue → normalized band).
export const BAND_TABLES: Record<string, (v: number) => number> = {
  classifiedAssetsCount: (v) => (v <= 3 ? 0 : v <= 6 ? 25 : v <= 9 ? 50 : v <= 13 ? 75 : 100),
  movablesCount: (v) => (v <= 0 ? 0 : v <= 2 ? 25 : v <= 5 ? 50 : v <= 8 ? 75 : 100),
  heirsCount: (v) => (v <= 3 ? 0 : v <= 6 ? 25 : v <= 9 ? 50 : v <= 13 ? 75 : 100),
  estimatedValueImpact: (v) => (v < 500000 ? 0 : v < 900000 ? 25 : v < 1500000 ? 50 : v < 3000000 ? 75 : 100),
  estateOutsideKingdom: (v) => (v >= 1 ? 100 : 0),
};
export const VALID_NORMALIZED = [0, 25, 50, 75, 100];

export function expectedBand(key: string, rawValue: number): number | null {
  const fn = BAND_TABLES[key];
  return fn ? fn(Number(rawValue)) : null;
}

/** Assert a criterion maps its raw value to the correct band and WeightedScore = Normalized × weight. */
export function assertCriterionConsistent(caseRow: CaseRow, key: string): Criterion {
  const c = crit(caseRow, key);
  expect(c, `criterion "${key}" missing from breakdown`).toBeTruthy();
  const criterion = c as Criterion;
  expect(VALID_NORMALIZED, `${key} NormalizedScore ${criterion.normalizedScore} not a valid band value`).toContain(criterion.normalizedScore);
  const want = expectedBand(key, criterion.rawValue);
  if (want !== null) {
    expect(criterion.normalizedScore, `${key}: RawValue ${criterion.rawValue} should map to band ${want}, got ${criterion.normalizedScore}`).toBe(want);
  }
  const expectedWeighted = criterion.normalizedScore * criterion.effectiveWeight;
  expect(
    Math.abs(criterion.weightedScore - expectedWeighted),
    `${key}: WeightedScore ${criterion.weightedScore} ≠ NormalizedScore ${criterion.normalizedScore} × weight ${criterion.effectiveWeight}`,
  ).toBeLessThan(0.5);
  return criterion;
}

/** Assert scoring math + rank mapping: weights sum ≈ 1, total = Σ weighted, rank matches score band. */
export function assertScoringConsistent(label: string, caseRow: CaseRow): { total: number; rank: string; weightSum: number } {
  const bd = breakdown(caseRow);
  expect(bd, `${label}: no breakdown`).toBeTruthy();
  const crits = Object.values(bd as Breakdown);
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
