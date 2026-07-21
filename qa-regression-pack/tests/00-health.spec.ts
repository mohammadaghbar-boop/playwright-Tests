import { test, expect } from '@playwright/test';
import { probeEnvironment, readHealth, type HealthReport } from '../src/helpers/health';

/**
 * Environment health probe — surfaces CIT reachability as a first-class test so a
 * mid-deploy run is visibly labelled rather than silently misread. Reuses the
 * snapshot `global-setup` wrote to `.health.json`; if that is missing (e.g. this
 * spec was run in isolation with `--grep`), it re-pings live.
 *
 * This test ALWAYS PASSES — it never gates a release on the environment. A DEGRADED
 * environment is recorded as a test annotation (and printed) so the reader knows to
 * discount downstream failures, not treated as a product defect.
 */
test.describe('Environment health', () => {
  test('@smoke @health portal / API / Nafath-mock / SMS-mock reachability is reported', async () => {
    let report: HealthReport | null = readHealth();
    if (!report) {
      report = await probeEnvironment();
      test.info().annotations.push({ type: 'health', description: 're-pinged live (.health.json absent)' });
    }

    // Record each target's reachability as an annotation for the report/trace.
    for (const t of report.targets) {
      test.info().annotations.push({
        type: 'health',
        description: `${t.name}: ${t.reachable ? `reachable (HTTP ${t.status})` : `UNREACHABLE${t.error ? ` — ${t.error}` : ''}`}`,
      });
    }

    if (report.degraded) {
      test.info().annotations.push({
        type: 'health-degraded',
        description: `ENVIRONMENT DEGRADED: ${report.unreachable.join(', ')}`,
      });
      // eslint-disable-next-line no-console
      console.warn(`[health] ENVIRONMENT DEGRADED: ${report.unreachable.join(', ')}`);
    }

    // The probe must have produced a structured report with the four targets.
    // We assert the reporting mechanism works, NOT that the environment is up.
    expect(report.targets.length, 'health report should cover all environment targets').toBeGreaterThan(0);
    expect(report).toHaveProperty('checkedAt');
    expect(typeof report.degraded).toBe('boolean');
  });
});
