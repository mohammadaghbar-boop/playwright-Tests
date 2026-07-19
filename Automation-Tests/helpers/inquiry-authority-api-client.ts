import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * API-level auth helper for JF-575 tests that hit the backend directly instead of driving
 * the Angular UI. The CIT environment does NOT accept forged/self-signed JWTs for a
 * successful-auth path (confirmed empirically — a Bearer token signed with the same
 * HS256 key/iss/aud used by jf-575-inquiry-authorities.spec.ts's forgeJwt() still gets a
 * flat 401, so forging is only useful for proving *denial*, e.g. TC-JF575-007).
 *
 * Instead, this reads the real, Nafath-issued access token that global-setup.ts already
 * saved for Majed ALQAHTANI in .auth/liquidator.json. It's stored as a (non-HttpOnly)
 * cookie scoped to the portal domain, not the API domain — the Angular app reads it
 * client-side and forwards it as `Authorization: Bearer <token>` to the separate API host
 * (confirmed via ServiceCollectionExtensions.cs: the JwtBearer handler's OnMessageReceived
 * only pulls a token from the query string, and only for /mainHub — there is no cookie
 * extraction for normal REST calls, so sending it as a Cookie header does nothing).
 */
// __dirname is Automation-Tests/helpers/ → repo-root .auth is two levels up.
const LIQUIDATOR_STORAGE_STATE = path.join(__dirname, '..', '..', '.auth', 'liquidator.json');

export function getLiquidatorAccessToken(): string {
  const raw = fs.readFileSync(LIQUIDATOR_STORAGE_STATE, 'utf-8');
  const state = JSON.parse(raw) as { cookies?: Array<{ name: string; value: string }> };
  const cookie = state.cookies?.find((c) => c.name === 'access_token');
  if (!cookie) {
    throw new Error(
      `No access_token cookie in ${LIQUIDATOR_STORAGE_STATE} — run global-setup.ts (npx playwright test) first.`,
    );
  }
  return cookie.value;
}

export function liquidatorAuthHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getLiquidatorAccessToken()}`, 'Content-Type': 'application/json' };
}

/** Repeats a base character to build a string of an exact length (for boundary tests). */
export function stringOfLength(len: number, unit = 'ا'): string {
  return unit.repeat(len);
}

/**
 * A string of EXACTLY `len` chars that is also unique per call — the unique `seed` prefix keeps
 * it from colliding with the per-case duplicate-name check on re-runs, while padding/truncation
 * pins the length for boundary tests (e.g. "exactly 255 accepted"). Use for name fields that must
 * be BOTH a specific length AND accepted (persisted); a fixed repeated char would be rejected as a
 * duplicate the second time the suite runs.
 */
export function uniqueStringOfLength(len: number, seed: string, fill = 'ا'): string {
  if (seed.length >= len) return seed.slice(0, len);
  return seed + fill.repeat(len - seed.length);
}

/** A tiny, deliberately-fake-content base64 payload — the app doesn't sniff file bytes
 * (confirmed gap, TC-JF575-011), so content-type acceptance is driven entirely by the
 * declared ContentType field, matching TC-JF575-027's existing placeholder-buffer style. */
export function fakeBase64(tag: string): string {
  return Buffer.from(`fixture-content-${tag}-${Date.now()}`, 'utf-8').toString('base64');
}
