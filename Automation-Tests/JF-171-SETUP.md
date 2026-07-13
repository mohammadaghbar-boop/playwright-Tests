# JF-171 Inheritance Classification — CIT test setup

Automates JF-TC-2938: verify that an inheritance with exactly 7-9 classified (Not
Ready/Constrained) assets scores the "Number of classified assets" criterion as
Average (50), and that this flows correctly into the weighted final score/rank.

Runs end-to-end against the real deployed CIT environment (no DB seeding for the
arrange step) — real referral → real backend inquiries → real classification —
and completes in under 30 seconds.

Test file: `Automation-Tests/JF-171-inheritance-classification.spec.ts`.
Read its header comment first — it explains the full technique and links the exact
backend source files it's based on.

## Prerequisites

```bash
cd Joint-Fund          # repo root
npm install
npx playwright install chromium   # if browsers aren't already installed
```

## Required `.env` (repo root, gitignored — never commit this file)

| Variable | Purpose | Where to get the real value |
|---|---|---|
| `COURT_API_KEY` | `CourtIntegration:ApiKey` — auth for `POST /cases/api/v1/referrals` | Ask Lina, or pull from the same source as below |
| `SAMA_CALLBACK_KEY` | `Sama:Webhook:ApiKey` — auth for the backend's own inbound SAMA callback endpoint | **Not** the placeholder in `appsettings.QA.json` — that doesn't work for this key. Real value lives in the `infath-helm` repo (`shared-config/values-dev.yaml`) or via `kubectl get secret jf-shared-secret -n infath-dev -o yaml`. Ask Lina for the value directly (short-lived team secret, not meant for chat/commit history). |
| `CMA_CALLBACK_KEY` | `Cma:Webhook:ApiKey` — same as above, for CMA | Same source as `SAMA_CALLBACK_KEY` |
| `CB_ADMIN_USER` / `CB_ADMIN_PASS` | CloudBeaver DB-relay admin login (Postgres is VPC-restricted; CloudBeaver is the relay) | Ask a team member — same account used by the rest of `Automation-Tests/` |
| `BASE_URL` | Portal URL | Defaults to `https://d-infath-jf-portal.azm-cit.com` — usually no need to set |
| `BASE_API_URL` | Backend API URL | Defaults to `https://d-infath-jf-api.azm-cit.com` — usually no need to set |
| `ESTATE_MANAGER_EMAIL` / `ESTATE_MANAGER_PASSWORD` | Portal login for the UI-visibility check | Defaults to the demo account (`demo-estate-manager@azm.sa` / `Azm@123`) — no need to set unless that account changes |
| `TENANT_ID`, `X_API_KEY` | Gateway headers | Defaults exist in `helpers/api-client.ts`; only override if your environment differs |

**Do not paste the real `SAMA_CALLBACK_KEY`/`CMA_CALLBACK_KEY` values into Slack,
commit messages, or any shared doc — pass them directly (DM, password manager, or
your team's normal secret-sharing channel), same as any other credential.**

## Running it

```bash
npx playwright test Automation-Tests/JF-171-inheritance-classification.spec.ts \
  --project=chromium --workers=1 --reporter=list
```

Expected: **6 passed, 1 skipped** (the 1 skip is a pre-existing, unrelated block —
the criterion's exact weight isn't verifiable without JF-171's source Excel, which
was never provided). Total runtime ~20-30 seconds.

If you see the classified-assets test itself skip with an "UNEXPECTED" message
instead of passing, that's a real regression worth investigating (see that test's
skip message and the file's header comment for what could cause it) — it is not
expected to happen given the current approach.

## Why this needed real investigation (context for review)

The straightforward approach — seed a referral, wait for the backend's automatic
SAMA/CMA bank-data inquiries to finish, then check the classified count — doesn't
work reliably against this CIT environment's mock: the *only* two national IDs
that satisfy the heirs-listing precondition both come with a large, fixed number
of SAMA/CMA bank-account fixture entries (12 and 21) that get created as
classified assets regardless of what you actually seed — already exceeding the
7-9 target band before a single test asset is added.

The fix: the test calls the backend's own inbound SAMA/CMA callback endpoints
itself, with an empty payload, immediately after the referral is created — this
wins the race against the mock's own (slower, non-empty) automatic webhook via
the backend's built-in idempotency check (whichever callback for a given
correlation ID arrives first wins; the second is silently discarded as a
duplicate). That neutralizes the SAMA/CMA side effect entirely, leaving only the
8 vehicles this test seeds plus 1 real-estate asset from the (always-required)
deed inquiry — landing at exactly 9, reliably, every run.

Full details, including the exact backend source files read to confirm this, are
in the spec file's header comment.
