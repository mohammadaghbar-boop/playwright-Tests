# Page Objects (`pages/`) — Phase 4 foundation

The target pattern for the whole suite: **selectors and flows live in Page Objects, specs
express intent only.** This kills the duplicated inline login, brittle selector OR-lists,
and `waitForTimeout`/`networkidle` waits the audit flagged.

## Structure
- `BasePage.ts` — base class (`page` + shared web-first helpers).
- `LoginPage.ts` — the one canonical email/password login (replaces inline logins).
- `EstatesListPage.ts` — example feature page (JF-22 estates list).
- Add one page object per screen/feature as you migrate.

## Rules for page objects
- **Locators:** prefer `getByRole` / `getByTestId`; structural CSS/`text=` as last resort.
- **Waits:** web-first assertions (`expect(locator).toBeVisible()`) and `locator.waitFor()`.
  Never `waitForTimeout(...)` or `waitForLoadState('networkidle')`.
- **URLs:** relative paths (`page.goto('/login')`) — relies on `use.baseURL` (Phase 2).
- **Methods express intent** (`searchByEstateNumber(n)`), not mechanics.

## Migration guide (story-by-story)
1. Pick one spec/story. Identify its screens.
2. Create/extend a Page Object per screen; move selectors + steps in.
3. Rewrite the spec to call page-object methods only (see
   `../JF-22-estates-list.pom.spec.ts` as the reference pilot).
4. Replace inline login with `LoginPage`.
5. Replace `waitForTimeout`/`networkidle` with web-first waits.
6. Verify green (locally + CI), then open a small PR for that story.

Do this **one spec group per PR** — never one giant rewrite.
