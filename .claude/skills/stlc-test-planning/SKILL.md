---
name: stlc-test-planning
description: Kick off STLC for a user story — establish scope, risks, entry criteria, and which test environment/data are needed. Use at the very start, before gap analysis.
when_to_use: starting testing on a story, "plan testing for JF-123", test planning
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Grep
---

## Test planning for $story

Produce a short, practical test plan — not a document for its own sake. Write it to
`qa-artifacts/$story/00-test-plan.md`.

Cover:
1. **Scope** — what this story changes (features, screens, APIs, DB tables). One paragraph.
2. **Out of scope** — explicitly what we will NOT test here.
3. **Risks & priority** — the riskiest areas to focus on; note anything time-sensitive.
4. **Entry criteria** — is the story ready? Has acceptance criteria? Is it in a testable
   status? Is the CIT/Dev environment up?
5. **Environment & data needs** — which portal role/user, which records, whether DB relay
   (CloudBeaver) or endpoint/mock access is required. Flag anything you'll need provisioned
   in `/stlc-env-setup`.
6. **Approach** — API-first vs UI, and why (API-first is cheaper/faster where possible).

Keep it to one page. End with a **"Ready to proceed? yes/blocked"** verdict and, if
blocked, exactly what's missing. Do not start gap analysis here — that's `/stlc-gap-analysis`.
