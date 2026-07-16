import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginInternal, loginViaNafath, captureDemoPanelToken } from './helpers/login';
import { NATIONAL_IDS } from './helpers/users';

const AUTH_DIR = path.join(__dirname, '..', '.auth');
const FRESH_MS = 50 * 60 * 1000; // just under Keycloak session lifetime

function isFresh(file: string): boolean {
  try {
    return Date.now() - fs.statSync(file).mtimeMs < FRESH_MS;
  } catch {
    return false;
  }
}

/**
 * A failed login for one role must not kill the whole pack — specs for that
 * role will fail (or skip) individually with a clear message instead. An empty
 * storageState file is written so Playwright can still start those projects.
 */
async function saveAuth(outFile: string, login: (page: import('@playwright/test').Page) => Promise<void>): Promise<void> {
  if (isFresh(outFile)) return;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ locale: 'ar-SA' });
  const page = await context.newPage();
  try {
    await login(page);
    await context.storageState({ path: outFile });
    console.log(`[global-setup] saved ${path.basename(outFile)}`);
  } catch (err) {
    console.error(`[global-setup] LOGIN FAILED for ${path.basename(outFile)} — dependent specs will fail: ${(err as Error).message.split('\n')[0]}`);
    if (!fs.existsSync(outFile)) fs.writeFileSync(outFile, JSON.stringify({ cookies: [], origins: [] }));
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  // Sequential on purpose — the Nafath mock rejects overlapping login requests.
  await saveAuth(path.join(AUTH_DIR, 'pd.json'), (p) => loginInternal(p));
  await saveAuth(path.join(AUTH_DIR, 'sp.json'), (p) => loginViaNafath(p, NATIONAL_IDS.serviceProvider));
  await saveAuth(path.join(AUTH_DIR, 'liquidator.json'), (p) => loginViaNafath(p, NATIONAL_IDS.liquidator));
  await saveAuth(path.join(AUTH_DIR, 'heir.json'), (p) => loginViaNafath(p, NATIONAL_IDS.heir, 'الأفراد'));

  // SystemAdmin bearer for admin-scoped flow-map / decision-point writes (round-2
  // workflow re-test). Captured via the demo-users panel — its password is not
  // available to the API-login helper. Cached to a file; specs read it and skip
  // cleanly when absent. Non-fatal: a failure just leaves those specs skipped.
  const adminTokenFile = path.join(AUTH_DIR, 'admin-token.txt');
  if (!isFresh(adminTokenFile)) {
    try {
      const token = await captureDemoPanelToken('admin@infath.sa');
      fs.writeFileSync(adminTokenFile, token ?? '');
      console.log(`[global-setup] ${token ? 'saved' : 'FAILED to capture'} admin-token.txt`);
    } catch (err) {
      console.error(`[global-setup] admin token capture errored — flow-map write specs will skip: ${(err as Error).message.split('\n')[0]}`);
      if (!fs.existsSync(adminTokenFile)) fs.writeFileSync(adminTokenFile, '');
    }
  }
}
