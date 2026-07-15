---
name: stlc-regression
description: Select and run the existing automated specs most likely affected by a story's area, to catch collateral breakage before shipping automation.
when_to_use: "run regression", check for regressions related to JF-123
argument-hint: "[JF-XXX]"
arguments: [story]
allowed-tools: Read, Grep, Bash
---

## Regression check for $story

Goal: make sure work around $story didn't break existing behaviour.

1. **Select** the relevant existing specs — same feature area/domain (e.g. same portal
   section, shared page objects, shared fixtures/helpers). Grep the suite for related
   selectors/routes. Note what you're including and, honestly, what you're skipping and why.
2. **Run** them (respect the 5-minute-per-scenario cap; evidence = text/traces, never
   screenshots). Run against the CIT/Dev environment.
3. **Report** to `qa-artifacts/$story/08-regression.md`: what ran, pass/fail, and any new
   failures with evidence. New failures → `/stlc-defect-log`.

If the suite can't run (e.g. config/env issue), say so clearly rather than reporting a
false green.
