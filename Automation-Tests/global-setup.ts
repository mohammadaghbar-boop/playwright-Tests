/**
 * Playwright global setup — runs once before all tests.
 * Logs in for each role and saves auth state to disk so individual
 * tests can reuse the session without triggering the mock Nafath
 * "active login request already exists" error on every beforeEach.
 *
 * Skips login if auth file is fresh (< 30 minutes old) to avoid
 * the mock server's "active login request already exists" error.
 */

import { chromium, FullConfig } from '@playwright/test';
import { loginAsServiceProvider, loginAsPurchasingDept } from './helpers/auth';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_DIR = path.join(__dirname, '..', '.auth');
const FRESH_MS = 55 * 60 * 1000; // 55 minutes (just under Keycloak session lifetime)

function isStale(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs > FRESH_MS;
  } catch {
    return true;
  }
}

async function saveAuth(
  loginFn: (page: any) => Promise<void>,
  outFile: string,
): Promise<void> {
  if (!isStale(outFile)) {
    console.log(`[global-setup] Skipping login — ${path.basename(outFile)} is fresh.`);
    return;
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: 'ar-SA' });
  const page = await context.newPage();
  await loginFn(page);
  await context.storageState({ path: outFile });
  await browser.close();
  console.log(`[global-setup] Saved auth to ${path.basename(outFile)}`);
}

// Majed ALQAHTANI (national ID 1100000011) — a real dual ServiceProvider+Liquidator user
// (obtained the role via the actual JF-567/JF-899 service-approval flow), used by
// JF-575's inquiry-authorities suite against his real accepted case (INH00581) instead
// of the demo-liquidator@azm.sa shortcut.
const LIQUIDATOR_NATIONAL_ID = '1100000011';

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const spFile = path.join(AUTH_DIR, 'sp.json');
  const pdFile = path.join(AUTH_DIR, 'pd.json');
  const liquidatorFile = path.join(AUTH_DIR, 'liquidator.json');

  await saveAuth((page) => loginAsServiceProvider(page, 0), spFile);
  await saveAuth((page) => loginAsPurchasingDept(page), pdFile);
  await saveAuth((page) => loginAsServiceProvider(page, LIQUIDATOR_NATIONAL_ID), liquidatorFile);
}
