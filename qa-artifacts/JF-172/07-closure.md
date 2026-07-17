# Test Closure — JF-172 (Send Assignment Request to the Liquidator)

**Final status: BLOCKED** (transitioned in Jira; comment 58714). **0 defects in JF-172 itself.**

## Coverage (16 cases)
- **Passed: 10** — auto-start after saved rank, higher-rank escalation D→A, never-lower-rank, liquidator-role filter, status «قيد تعيين المصفي», single event-23 log + View-More, appears in liquidator list, duplicate-request guard, exclude-non-accepter, no-eligible-stop. Verified against real completed assignments (INH00016, INH00018).
- **Blocked: 6** (all explicit ACs) — same-rank-first (TC-04), inactive-exclusion (TC-03), workload priority (TC-07), tie-break (TC-08), no-rank-no-start (TC-12), 48h reassignment (TC-14).

## Blockers (linked in Jira)
- **is blocked by JF-717** — SAMA inquiry callback timeout → retry never triggered → inquiry never finishes → readiness never fires → no fresh classification → no fresh pending assignment.
- **is blocked by JF-927** — non-deterministic asset readiness (also blocks the NA/no-rank path).
- **relates to JF-719, JF-726, JF-735** — SAMA no-retry / manual re-inquiry stuck (SignalR CORS) / NULL-inquiry-as-PASS.

## Automation
`Automation-Tests/JF-172-liquidator-assignment.spec.ts` — API-first regression guards, verified green; the 6 blocked ACs are included as ready-to-run `test.fixme` (traced to AC + blocker). PR #19.

## To close (dev/infra)
Fix JF-717 + JF-927 → the classification pipeline mints a fresh classified estate → assignment fires → build a 2nd/same-rank/inactive liquidator service → the 6 fixme cases become runnable (remove `.fixme`). No JF-172 code defect found; the gap is purely the upstream pipeline.

## Metrics
Cases 16 · Passed 10 · Blocked 6 · Defects (JF-172) 0 · Blocking bugs 2 (JF-717, JF-927) + 3 related.
