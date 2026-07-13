# Helper consolidation (Phase 3)

## Done: `getEstateManagerToken` deduplicated
It existed near-identically in `helpers/api-client.ts` and `helpers/browser-auth.ts`.
The canonical version now lives in `api-client.ts` (extended to honour the
`ESTATE_MANAGER_TOKEN` env override that only `browser-auth.ts` previously had), and
`browser-auth.ts` re-exports it — so existing importers of either module are unaffected.

## Deliberately NOT merged: the two DB clients
`utils/db-client.ts` and `helpers/jf157-db-client.ts` look like duplicates but have
**incompatible contracts**, so merging them blind would break specs:

| | `utils/db-client.ts` | `helpers/jf157-db-client.ts` |
|---|---|---|
| Write policy | **SELECT/UPDATE only** (node-sql-parser guard) | Allows **INSERT/DELETE** (its seed/cleanup helpers depend on it) |
| `query()` return | `{ rows, rowCount }` | `T[]` |
| Auth | `CB_USERNAME`/`CB_PASSWORD` (env) | browser-obtained session cookie (`setCbSessionCookie`) |
| Consumers | `db-fixture` example, general assertions | JF-171 / jf157 data seeding (`seedJudgmentDeedIngestion`, `addRealEstateAssetToCase`, `deleteSeedDeedIngestion`, …) |

Pointing the jf157 specs at `utils/db-client.ts` would make their `INSERT`/`DELETE` seed
helpers throw (the SQL guard rejects them), and the differing return shape would break
every call site.

### Safe consolidation path (for later, once verifiable against the live DB + CI)
1. Decide the policy: either extend `utils/db-client.ts` with an explicit, clearly-named
   guarded-write path for seeding, or keep a separate "seeding" client but share the
   transport/auth layer between the two.
2. Unify the `query()` return shape behind one interface.
3. Migrate jf157/JF-171 call sites one spec at a time, verifying each against the DB.

This is intentionally deferred rather than done blind — it's data-seeding-critical and
can't be validated without live DB access + CI.
