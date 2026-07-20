# JF Real-Life Scenarios — End-to-End User Journeys

A **separate, self-contained** automation pack for the Infath Joint Funds portal. It is
**not** the regression pack and not the backlog map — it answers a different question:

> *What do real users actually do, and can they get through their journey?*

Each spec is **one persona's story**, told as a sequence of narrated steps through the
**browser UI** (the way a human experiences the product), crossing many features in a
realistic order — not isolated per-feature checks.

## Why it's separate
| Pack | Question it answers | Shape |
|---|---|---|
| `regression-pack` | Did any feature regress after deploy? | Per-feature/story guards, mostly API |
| `regression-pack/tests-backlog` | Do we have coverage for every story? | 1 skeleton per story |
| **`real-life-scenarios`** *(this)* | **Can a real user complete their journey?** | **Persona journeys, UI-driven, end-to-end** |

## The journeys
| File | Persona | The story |
|---|---|---|
| `public-letter-verification.journey.spec.ts` | Public visitor | Verifies an official letter is authentic (QR page) |
| `liquidator-day.journey.spec.ts` | Liquidator (مصفي) | Logs in → assigned estate → assets → correspondence → inquiries → a task |
| `heir-journey.journey.spec.ts` | Heir (وريث) | Logs in → dashboard → linked estates → inquiries → disclosure |
| `estate-manager-e2e.journey.spec.ts` | Estate Manager (مدير التركة) | Estates list → open estate → tabs → inquiries → managers → classification → totals |
| `relationship-manager-day.journey.spec.ts` | Relationship Manager (مدير العلاقة) | Dashboard → incoming inquiries → an estate they relate to |
| `service-provider-onboarding.journey.spec.ts` | Service Provider (مزود الخدمة) | Nafath → facility → add liquidation service → (becomes a liquidator) |
| `purchasing-review.journey.spec.ts` | Purchasing Employee (موظف المشتريات) | Reviews facility/service registrations → approve/reject controls |

## How it reads
Each journey uses `step('narrated action', …)` blocks, so the Playwright HTML report reads
like a user flow. When a real user hits a wall that's a **known open bug**, the journey calls
`blockedHere('JF-xxxx', 'what the user sees')` — it records the true end-user experience (with
the Jira key) and stops gracefully, instead of red-failing on a tracked issue. That means a
journey's result tells you *how far a real user can actually get today*.

## Running
```bash
npm install
cp .env.example .env          # optional — demo defaults work out of the box
npx playwright install chromium  # first time only (bundled Chromium)
npx playwright test           # all journeys (bundled Chromium)
npm run test:headed           # watch the browser drive each journey
npx playwright test liquidator-day --reporter=line
npx playwright show-report    # step-by-step narrated report
```
Notes:
- TypeScript, strict. Single worker (the Nafath mock rejects concurrent same-user logins).
- Read-only against CIT — journeys observe and navigate; they don't create/mutate live records
  (where an action would mutate, the journey asserts the control is present, then backs out).
- No screenshots (team policy) — evidence is the narrated report + traces on failure.

## Personas & fixtures
Defined in `src/personas.ts` / `src/world.ts`. Reuses cycle fixtures: liquidator NID
`1100000011`, golden assigned estate `INH00016`, registered heir `1133154595`, and the demo
internal accounts. Known blockers a real user hits are catalogued in `src/world.ts`.
