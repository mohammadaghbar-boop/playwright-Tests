# UI / Visual Verification — reference (checklist + UI Test Guide template)

Applies to **user-facing / UI-heavy** stories. **Headless DOM assertions are NOT sufficient
evidence of the rendered UI** — a visual pass is mandatory and ends in a **human review gate**
(the human looks at the captured screens before closure).

## 1. Story-nature triage (how much UI testing)
- **UI-heavy** (screens, forms, dashboards, rosters, lists — e.g. JF-840): FULL visual pass **+** a story-specific UI Test Guide.
- **API / logic / backend** (endpoints, calculations, integrations — e.g. JF-844, JF-172 logic): DOM/text + DB/API checks suffice; visual optional.
- **Mixed:** visual pass on the user-facing parts only.

## 2. Screenshot handling — LOCAL ONLY, never committed, split by outcome
Capture with Playwright `page.screenshot()`. Store under a **gitignored** evidence tree, **split by outcome so issues are isolated**:
- `qa-artifacts/$story/evidence/ui/passed/` — screens that render correctly.
- `qa-artifacts/$story/evidence/ui/issues/` — **any** screen with an issue / possible break / anything worth a second look.
Name files `<screen>__<state>__<role>.png`. Ensure `qa-artifacts/**/evidence/` is in `.gitignore` — **these images live locally for review only and are never pushed to the repo.**

## 3. Generic UI checklist — verify on every captured screen (13 areas)
1. **Layout & structure** — elements present, aligned; no overlap/overflow/truncation.
2. **RTL / i18n (Arabic)** — direction, mirroring, no clipped/garbled text, correct labels.
3. **State rendering** — status **badges** (right label + colour per status), progress %/bars, counters.
4. **Empty / loading / error states** — render correctly and legibly.
5. **Role/permission visuals** — actions shown vs hidden/disabled per role.
6. **Responsive** — key breakpoints (if applicable).
7. **Data-to-UI fidelity** — on-screen values match DB/API (name, count, %).
8. **Accessibility basics** — focus visibility, contrast, labels.
9. **Design fidelity** — matches the design/Figma spec if one is linked.
10. **Console & network health** — no JS console errors; no failed API calls (4xx/5xx) firing on the page.
11. **No leaked placeholders** — no raw i18n keys (`disclosures.title`), no `undefined` / `null` / `NaN` / `[object Object]`.
12. **Locale formatting** — currency (SAR), dates (Hijri/Gregorian), Arabic numerals per design.
13. **Overflow / boundary rendering** — long Arabic names, large counts, many items → no clipping/breakage.

Any screen failing any item → its screenshot goes to `issues/` with a one-line note.

## 4. Story-specific UI Test Guide → `qa-artifacts/$story/ui-test-guide.md`
Derive from the story ACs + implementation analysis (source read) + gap analysis. Write it as an
explicit, **numbered step-by-step guide a human can follow**, one section per screen/flow. Each
likely-broken item carries a **severity tag** (`[Critical]` / `[High]` / `[Medium]` / `[Low]`) so
the tester triages what to scrutinise first.

### Template
```
## Flow N — <name>   (role: <X>)
Steps:
  1. Log in to the portal as **<role>**.
  2. Navigate to <…>.
  3. <action — e.g. select the estate → click عرض → open the المخاطبات الخارجية tab>.
  4. Capture a screenshot → evidence/ui/(passed|issues)/<screen>__<state>__<role>.png
Check the following (expected UI):
  1. <expected item 1>
  2. <expected item 2>
  3. <expected item 3>
  4. …
Likely-broken / hotspots to hunt (each with severity):
  - [Critical] <what might break + why (from a gap/complexity/code path)> → if seen, capture to issues/
  - [High]     <…>
  - [Medium]   <…>
Data cross-check: <on-screen value> == <DB/API source>
```
End the guide with a **Role matrix**: for each role (e.g. Liquidator, مدير التركة, مدير العلاقة), which screens/actions are visible vs hidden/disabled.
