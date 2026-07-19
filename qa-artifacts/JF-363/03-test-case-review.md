# Test-Case Review — JF-363

Reviewed `02-test-cases-AIO.csv` (15 cases) vs the story ACs and confirmed scope.

| Check | Result |
|---|---|
| Categories | ✅ Accept (01–04), Reject (05–10), data-hiding (11,12), edge (13 expiry, 14 modal, 15 transactional) |
| In-scope ACs covered | ✅ accept→«قيد العمل»+full access+log, buttons removed, reject+reason+log, status stays «قيد تعيين مصفي», removed-from-list, exclusion, reassignment restart, accept/reject from list, read-only+sensitive-data-hidden, 48h expiry, confirmation modals, transactional |
| Out-of-scope correctly excluded | ✅ no notification cases (Raouf), no exhaustion cases (Raouf), no letter-download case (deferred per JF-172) |
| Valid AIO CSV | ✅ 11 cols, 15 cases, Status=NR, Story=JF-363 |

**Data dependencies:** TC-11/12 (pre-acceptance data-hiding) and TC-13 (48h expiry) need a **pending** assignment request — none currently exists (INH00016 accepted, INH00018 rejected); TC-15 needs fault injection. Verdict: **Approved**; accept/reject/log/exclusion verifiable against real data now, the rest flagged data-limited.
