import { closePool } from './utils/db-client';

/**
 * Playwright globalTeardown — runs once after the entire suite finishes, regardless
 * of which spec files ran. Closes the shared DB pool so the process can exit cleanly
 * instead of leaking open Postgres connections.
 */
export default async function globalTeardown(): Promise<void> {
  await closePool();
}
