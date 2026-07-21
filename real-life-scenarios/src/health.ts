import { request as pwRequest, APIRequestContext } from '@playwright/test';
import { URLS } from './world';

/**
 * Environment health preflight (read-only).
 *
 * `checkEnv()` GETs the four hosts the journeys depend on — portal, backend API,
 * Nafath mock, SMS mock — and returns a status object. It is deliberately
 * NON-fatal: a host that is down is reported as `reachable:false`, never thrown.
 * The `00-health` journey uses this to give the pack a fast env signal (HEALTHY /
 * DEGRADED) before the long persona journeys, and to label WHY a later journey
 * might struggle (e.g. the Nafath mock being unreachable explains a login wall).
 *
 * Reachability, not correctness: a host that answers at all (even 401/404) is
 * "reachable". Only a network error or a 5xx counts against health — a probe path
 * that 404s still proves the server is up.
 */

export type EnvStatus = 'HEALTHY' | 'DEGRADED';

export interface ServiceHealth {
  /** Short label shown in the report. */
  name: string;
  /** The exact URL probed. */
  url: string;
  /** True when the GET returned any HTTP response (no network/TLS error). */
  reachable: boolean;
  /** The HTTP status if we got one, else null. */
  httpStatus: number | null;
  /** Healthy for this service: reachable AND not a 5xx. */
  ok: boolean;
  /** Error text when unreachable, or the status line when a 5xx. */
  detail?: string;
}

export interface EnvHealth {
  status: EnvStatus;
  checkedAt: string;
  services: ServiceHealth[];
  /** Names of the services that are not `ok` (unreachable or 5xx). */
  degraded: string[];
}

/** The hosts every journey leans on, with a lightweight GET probe path each. */
const PROBES: ReadonlyArray<{ name: string; url: string }> = [
  { name: 'portal', url: `${URLS.portal}/` },
  { name: 'api', url: `${URLS.api}/` },
  { name: 'nafath-mock', url: `${URLS.nafathMock}/` },
  // The SMS mock exposes this JSON list (the OTP reader polls it) — a good liveness probe.
  { name: 'sms-mock', url: `${URLS.smsMock}/api/notifications` },
];

async function probe(ctx: APIRequestContext, name: string, url: string): Promise<ServiceHealth> {
  try {
    const res = await ctx.get(url, { timeout: 15_000, maxRedirects: 5 });
    const httpStatus = res.status();
    const is5xx = httpStatus >= 500;
    return {
      name,
      url,
      reachable: true,
      httpStatus,
      ok: !is5xx,
      detail: is5xx ? `HTTP ${httpStatus}` : undefined,
    };
  } catch (err) {
    return {
      name,
      url,
      reachable: false,
      httpStatus: null,
      ok: false,
      detail: (err as Error).message.split('\n')[0],
    };
  }
}

/**
 * Probe every dependency host and return an aggregate health object.
 * Never throws — a downed host surfaces as `reachable:false`, and the overall
 * status degrades to `DEGRADED` rather than failing.
 */
export async function checkEnv(): Promise<EnvHealth> {
  const ctx = await pwRequest.newContext({ ignoreHTTPSErrors: true });
  try {
    const services = await Promise.all(PROBES.map((p) => probe(ctx, p.name, p.url)));
    const degraded = services.filter((s) => !s.ok).map((s) => s.name);
    return {
      status: degraded.length === 0 ? 'HEALTHY' : 'DEGRADED',
      checkedAt: new Date().toISOString(),
      services,
      degraded,
    };
  } finally {
    await ctx.dispose();
  }
}
