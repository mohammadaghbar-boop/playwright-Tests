# Gap Comment (POSTED) — JF-172

> Posted to JF-172 via Jira MCP after user approval. Reflects Saeed's authoritative scope confirmation.

---

**QA gap analysis — JF-172 (Send Assignment Request to Liquidator)**

Reviewed the story, its 10 sub-tasks, linked issues, and the thread ahead of testing.

**Confirmed scope (per Saeed — treated as authoritative):**
- **Authorization Letter / attachment is OUT of scope for JF-172** ("Attachment will not be part of this story"). QA will therefore **not** test letter generation/attachment ACs here (this also explains sub-tasks JF-784/JF-786 still being In Progress — deferred). Letter date/content questions are moot for this story.
- Assignment is at **service level** (accepted liquidator service with a rank), not user level.
- A liquidator is eligible only if the **account is active**.

**In scope for this QA pass:** eligibility filter (active + Liquidator service), rank match + never-lower-rank, workload priority (accepted + pending; tie → next in queue), send request, status → «قيد تعيين المصفي», single inheritance-log entry, duplicate-request guard, 48h timeout → reassignment + non-responder exclusion. (Rank *derivation* A/B/C/D/NA is JF-171's scope, not here.)

**Readiness notes**
1. Trigger dependency **JF-171 is currently `Blocked`** — QA will run against estates already classified in CIT (ranks A and D exist) and note that fresh-from-classification E2E depends on JF-171 unblocking.
2. Sub-task **JF-788 (send request)** is still In Progress — QA will verify the live send/status/log behaviour and mark anything incomplete as "Requires dev".

**Minor open decisions (flagging, not blocking)**
3. **Status label:** story sets «قيد تعيين المصفي» but the case reportedly still displays «اسناد التركة» while pending (rabaabah) — QA will check stored status vs displayed label.
4. **Highest-rank (A) escalation edge:** when the inheritance is rank A and no A-ranked liquidator exists, escalation to a higher rank is impossible; the "no eligible liquidator" fallback is out of scope — behaviour to confirm.
5. **JF-902** (no duplicate-service guard, still open) can skew the workload/fairness result — noted when validating "lowest workload / next in queue".

Proceeding to author and run the assignment-mechanics cases against the existing classified estates with the real liquidator (NID 1100000011).

— QA (Ahmad)
