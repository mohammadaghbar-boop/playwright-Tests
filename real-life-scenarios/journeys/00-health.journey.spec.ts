import { test, expect } from '@playwright/test';
import { step } from '../src/journey';
import { checkEnv } from '../src/health';

/**
 * PREFLIGHT — "Is the CIT environment even up before we start?"
 *
 * The fastest journey in the pack: no login, no browser walk — it just GETs the four
 * hosts every persona journey depends on (portal, API, Nafath mock, SMS mock) and
 * reports reachability. It is tagged `@smoke @health` so it runs first in the smoke
 * subset and gives a one-glance env signal.
 *
 * By design it NEVER hard-fails: a downed host is recorded and annotated as DEGRADED,
 * not turned into a red failure — a preflight that red-fails would just be noise. If a
 * later journey stalls on a login wall, this test's annotations say whether the env was
 * to blame (e.g. the Nafath mock being unreachable).
 */
test.describe('Journey: Preflight — environment health', () => {
  test('the CIT environment is reachable before the journeys run @smoke @health', async () => {
    const health = await checkEnv();

    await step('probe portal / API / Nafath-mock / SMS-mock', async () => {
      for (const s of health.services) {
        const line = `${s.name}: ${s.reachable ? `reachable (HTTP ${s.httpStatus})` : `UNREACHABLE — ${s.detail ?? 'no response'}`}`;
        // eslint-disable-next-line no-console
        console.log(`[health] ${line}`);
        test.info().annotations.push({ type: s.ok ? 'env-ok' : 'env-degraded', description: line });
      }
    });

    await step(`overall: ${health.status}`, async () => {
      if (health.status === 'DEGRADED') {
        test.info().annotations.push({
          type: 'env-status',
          description: `DEGRADED — not-ok: ${health.degraded.join(', ')}. Journeys touching these hosts may stall.`,
        });
      } else {
        test.info().annotations.push({ type: 'env-status', description: 'HEALTHY — all dependency hosts responded.' });
      }
      // Preflight never hard-fails on reachability — it only asserts it actually ran a probe.
      expect(health.services.length, 'health probe should cover every dependency host').toBeGreaterThan(0);
    });
  });
});
