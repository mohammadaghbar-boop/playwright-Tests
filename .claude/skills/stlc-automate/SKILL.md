---
name: stlc-automate
description: Turn a story's final, working test steps into a Playwright/TypeScript spec that follows repo conventions, and verify it is green before it goes near the repo.
when_to_use: "automate the tests for JF-123", write the Playwright script, create the spec
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Edit, Grep, Bash
---

## Author the automation spec for $story

Build a Playwright/TS spec from the **final, approved, working** steps (the classified,
passing cases and the exact steps that produced them) — not the exploratory attempts.

### Follow repo conventions
- TypeScript, `import` syntax, strict types (match the suite).
- Naming: `JF-XXX-kebab-name.spec.ts` under the right folder for the domain.
- Reuse the shared login/auth, fixtures, and page objects; use `baseURL`/relative paths
  once available. Prefer role/testid locators and **web-first assertions**; avoid
  `waitForTimeout`/`networkidle`. (See the audit's restructure conventions.)
- Evidence/artifacts: rely on Playwright trace/video; **never screenshots**.

### Verify before handing off
Run the new spec and confirm it is **green** locally (discovery + actual run). A spec that
isn't verified green does not proceed. If parts can't pass yet (pending dev / data), mark
them skipped with a clear reason rather than forcing a pass.

Run it in **isolation** (a minimal/scoped config or a single-file invocation) so an
unrelated break in the shared config or a browser `globalSetup` an API-only spec doesn't
need can't block or mask a real green.

### Fixtures & data hygiene
- **Skip, don't fail, when a fixture is absent.** Guard fixture-dependent cases so they
  skip cleanly (with a clear reason) if the seeded record/relay isn't in the target env —
  a missing fixture is not a product failure.
- **Never hard-code PII** (national ids, names). Fetch it from the DB/API at runtime.

Do **not** commit or push here — that's `/stlc-sync-pr`, which handles branch/worktree
isolation and the PR.
