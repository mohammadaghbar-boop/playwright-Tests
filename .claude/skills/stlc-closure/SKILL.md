---
name: stlc-closure
description: Close out the STLC for a story — a final report with metrics and lessons, exit-criteria check, and the Jira story status transition.
when_to_use: "close out JF-123", final test report, test closure, wrap up testing
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Write, Grep
disable-model-invocation: true
---

## Test closure for $story

Assemble the final report to `qa-artifacts/$story/09-closure-report.md` from all prior
artifacts (plan, gap analysis, cases, results, classification, defects, AIO update,
regression).

Include:
- **Executive summary** — what was tested, overall outcome.
- **Metrics** — total cases; counts by classification (Passed/Failed/Gap/NA/Requires dev
  support); defects raised (with keys/links); coverage vs acceptance criteria;
  automation added (spec + PR link).
- **Requires-dev-support / open items** — what's blocked and on whom.
- **Lessons learned** — flakiness, environment/data gaps, anything to improve next cycle.

### Exit criteria (must all be true to declare done)
- [ ] Every case has a final classification.
- [ ] Every Failed/Gap has a linked defect.
- [ ] AIO cycle updated.
- [ ] Automation spec merged or PR open.
- [ ] Report written.

**Human gate:** propose the Jira **story status transition** (e.g. Tested / Ready, or back
to Dev if failing) and only transition via the Jira MCP after the user approves. State
plainly whether exit criteria are met or what's outstanding.
