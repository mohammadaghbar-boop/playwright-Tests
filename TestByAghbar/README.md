# TestByAghbar — per-story E2E specs

Part of the unified Joint Funds automation suite. This folder holds **feature/story-organized**
end-to-end specs; the shared **Page Objects, fixtures, and helpers** live in `../Automation-Tests/`
(`pages/`, `fixtures/`, `helpers/`). Together they form one feature-based suite.

## Layout

```
TestByAghbar/
  auth.setup.ts            # service-provider (SP) login → storageState .auth/user.json
  heir-auth.setup.ts       # heir (Nafath) login    → storageState .auth/heir.json
  JF-563-services-list/     # SP portal — services list feature
    01-login.spec.ts        #   login flow (no storageState)
    02..07-*.spec.ts        #   feature specs (reuse SP storageState)
  JF-167-heirs-admission/   # heir portal — heirs admission feature
    01-heir-login.spec.ts   #   login flow (no storageState)
    02..07-*.spec.ts        #   feature specs (reuse heir storageState)
```

Convention: one folder per story (`JF-<id>-<kebab-name>/`), specs numbered `NN-*.spec.ts`;
`01-*` is always the login-flow spec (runs with a clean session), `02+` are feature specs that
reuse cached auth.

## How it runs (see root `playwright.config.ts`)

The config wires each story through a **project graph**, so login happens once per role and
feature specs reuse the cached `storageState`:

| Project | testMatch | storageState |
|---|---|---|
| `setup` | `**/auth.setup.ts` | writes `.auth/user.json` |
| `login-tests` | `**/JF-*/01-login.spec.ts` | none (tests the login flow) |
| `e2e` | `**/JF-*/0[2-9]-*.spec.ts` (excl. JF-167) | `.auth/user.json` (dep: `setup`) |
| `heir-setup` | `**/heir-auth.setup.ts` | writes `.auth/heir.json` |
| `heir-login-tests` | `**/JF-167-*/01-*.spec.ts` | none |
| `heirs-e2e` | `**/JF-167-*/0[2-9]-*.spec.ts` | `.auth/heir.json` (dep: `heir-setup`) |

## Running

```bash
# service-provider feature specs (runs setup → e2e)
npx playwright test --project=setup --project=e2e
# heir feature specs
npx playwright test --project=heir-setup --project=heirs-e2e
# just the login flows
npx playwright test --project=login-tests --project=heir-login-tests
```

## Conventions
- **No screenshots** — evidence is text/logs/Playwright traces (team policy).
- Target the **CIT/Dev** portal (`d-infath-jf-portal.azm-cit.com`) with seeded/mock users — never production.
- `.auth/` (cached storageState) is gitignored — never commit it.
