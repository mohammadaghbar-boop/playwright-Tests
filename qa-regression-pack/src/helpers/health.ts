import { request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { URLS } from './users';

/**
 * Environment preflight — a fast reachability probe of the four hosts the pack
 * depends on (portal, API, Nafath mock, SMS mock). It NEVER fails the run: a
 * mid-deploy CIT (503/timeout) should be *labelled* DEGRADED, not misread as a
 * pile of new product regressions. The status is persisted to `.health.json`
 * so the `tests/00-health.spec.ts` probe can report it as an annotated test.
 */

export interface TargetHealth {
  name: string;
  url: string;
  reachable: boolean;
  status: number | null;
  error?: string;
}

export interface HealthReport {
  checkedAt: string;
  degraded: boolean;
  unreachable: string[];
  targets: TargetHealth[];
}

/** Absolute path to the persisted health snapshot (repo root, next to config). */
export const HEALTH_FILE = path.resolve(__dirname, '..', '..', '.health.json');

/** A GET counts as "reachable" if the host answers with ANY HTTP status —
 *  even 401/403/404. We are probing liveness, not authorization. */
function targets(): Array<{ name: string; url: string }> {
  return [
    { name: 'portal', url: `${URLS.portal}/login` },
    { name: 'api', url: `${URLS.api}/cases/api/v1/court-cases?pageIndex=1&pageSize=1` },
    { name: 'nafath-mock', url: URLS.nafathMock },
    { name: 'sms-mock', url: `${URLS.smsMock}/api/notifications` },
  ];
}

/** Ping every target once and return a structured report. Pure — no side effects. */
export async function probeEnvironment(timeoutMs = 15_000): Promise<HealthReport> {
  const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
  const results: TargetHealth[] = [];
  try {
    for (const t of targets()) {
      try {
        const res = await ctx.get(t.url, { timeout: timeoutMs, failOnStatusCode: false });
        results.push({ name: t.name, url: t.url, reachable: true, status: res.status() });
      } catch (err) {
        results.push({
          name: t.name,
          url: t.url,
          reachable: false,
          status: null,
          error: (err as Error).message.split('\n')[0],
        });
      }
    }
  } finally {
    await ctx.dispose();
  }
  const unreachable = results.filter((r) => !r.reachable).map((r) => r.name);
  return {
    checkedAt: new Date().toISOString(),
    degraded: unreachable.length > 0,
    unreachable,
    targets: results,
  };
}

/** Probe, print a clear banner, and persist `.health.json`. Never throws. */
export async function runPreflight(): Promise<HealthReport> {
  let report: HealthReport;
  try {
    report = await probeEnvironment();
  } catch (err) {
    // Even a catastrophic probe failure must not kill the run.
    report = {
      checkedAt: new Date().toISOString(),
      degraded: true,
      unreachable: ['probe-error'],
      targets: [],
    };
    console.error(`[health] preflight probe errored: ${(err as Error).message.split('\n')[0]}`);
  }

  const summary = report.targets
    .map((t) => `${t.name}=${t.reachable ? `up(${t.status})` : 'DOWN'}`)
    .join(' ');
  if (report.degraded) {
    console.error(`[health] ENVIRONMENT DEGRADED: ${report.unreachable.join(', ')} — ${summary}`);
    console.error('[health] results below may reflect environment, not product regressions.');
  } else {
    console.log(`[health] environment OK — ${summary}`);
  }

  try {
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(report, null, 2));
  } catch (err) {
    console.error(`[health] could not write ${HEALTH_FILE}: ${(err as Error).message.split('\n')[0]}`);
  }
  return report;
}

/** Read the persisted snapshot if one exists (used by the health spec). */
export function readHealth(): HealthReport | null {
  try {
    return JSON.parse(fs.readFileSync(HEALTH_FILE, 'utf8')) as HealthReport;
  } catch {
    return null;
  }
}
