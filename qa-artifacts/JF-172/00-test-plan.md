# Test Plan — JF-172

**Story:** إرسال طلب تعيين للمصفي / Send Assignment Request to the Liquidator
**Type:** Story · **Status:** QA · **Parent epic:** JF-137 · **Link:** https://saudiazmco.atlassian.net/browse/JF-172
**Run env:** CIT (post Postgres→SQL Server migration). Worktree `pw-jf172` on skills `f8f9d9c`.

## 1. Scope
System-driven process that fires immediately after an inheritance is classified with rank A/B/C/D: retrieve liquidator **services** → filter (active account + Liquidator role) → rank match (same rank, then next-higher, never lower) → workload priority (lowest accepted + pending; tie → next in queue) → generate Authorization Letter → attach/store on the inheritance → send assignment request → status→«قيد تعيين المصفي» → one inheritance-log entry → 48h no-response timeout → 3-attempt retry on technical failure.

## 2. Out of scope
Manual assignment by the manager; the liquidator's accept/reject (that's **JF-363**, tested next); notification content mechanics (covered under JF-363/JF-360).

## 3. Environment & data — REAL state (verified via SQL-Server relay)
- **Classified, unassigned estates available:** rank **A** — INH00009, INH00005, INH00014; rank **D** — INH00010, INH00001, INH00018, INH00004, INH00017. (INH00016 = rank D already assigned to the liquidator → reserved for JF-363.)
- **Liquidator identity:** Majed ALQAHTANI, NID **1100000011**, roles [ServiceProvider, Liquidator], approved مصفي service ranking **A** (userId 420ABCD2-…). Nafath mock login works.
- **DB relay:** CloudBeaver → SQL Server `Azm_JointFunds`, schema `[Case]`, login `cbadmin`. Read via `sqlsrv` relay.
- **Classification coverage:** ranks **A** and **D** exist and are **sufficient** for JF-172. Rank *derivation* (A/B/C/D/NA) is **JF-171's** concern and is tested there; JF-172 only *consumes* a saved rank to drive selection. Per product guidance, **B/C/NA-specific cases are out of scope for JF-172** (not required by this story). Any single valid rank exercises the assignment trigger; A and D let us also sanity-check rank-based selection with the available liquidator (service ranked A).

## 4. Risks & priority
1. **Selection fairness/correctness (highest):** eligibility (active + Liquidator service), workload priority + tie-break, and never-lower-rank. (Exhaustive rank-derivation matrix is JF-171's scope, not here.)
2. **Authorization Letter gate (high):** must generate before send; must not send on letter failure. (Letter path is proven reachable — JF-844 generated MK-581-1 via this exact flow.)
3. **Idempotency/duplicate request (high).**
4. **48h timeout → reassignment → exclusion (medium)** — via DB timestamp manipulation.
5. **Retry policy on technical failure (medium)** — needs fault injection; likely partially blocked.

## 5. Entry criteria — assessment
| Check | Result |
|---|---|
| ACs present | ✅ 18 ACs + full flow/rules |
| Trigger dependency (classification) | ✅ classified estates exist (A/D); JF-171 pipeline drivable |
| Liquidator available | ✅ NID 1100000011 (real, approved service) |
| Downstream blocker JF-946 | ✅ now Ready-For-UAT (was the E2E blocker) |
| Classification coverage | ✅ A/D available; B/C/NA out of scope (JF-171 covers rank derivation) |
| Test env up | ✅ portal/API/DB reachable |

**Verdict: READY.** Assignment mechanics fully testable on the available classified estates + real liquidator. Only the technical-failure/retry fault paths may be partially exercisable (needs fault injection) — documented, not faked.

## 6. Approach
API/DB-first, UI-confirmatory. Trigger assignment on unassigned classified estates and assert on the assignment-request row, inheritance status, and inheritance-log via the SQL-Server relay; use the real liquidator to confirm the request surfaces. Time/fault ACs via DB timestamp manipulation. No screenshots — evidence = API/DB output + traces.

**Ready to proceed → YES (partial).** Proceeding to gap analysis; the standout callouts are the A/D-only classification coverage (JF-1058/JF-927) and the letter/retry fault paths.
