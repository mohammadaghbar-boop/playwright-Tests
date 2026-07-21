# AIO Test — CSV import format

**Match the working template `JF-759_Test_Cases_AIO.csv` exactly** — that file imports into
AIO; deviations do not. It is a simple **11-column, plain UTF-8 (no BOM), LF** CSV, **one row
per step**, with **no quoting anywhere**. (A 27-column / BOM / CRLF variant does **not**
import — that was a wrong turn; so does an 11-column file that uses quoted fields.)

## Header (row 1, verbatim — 11 columns)
```
Test Id,Summary,Priority,TestSteps,ExpectedResults,Story,Test Type,Component,Release,Status,Creator
```

## Row model (exactly as JF-759)
- **Case row (11 fields):**
  `TC-<storyNumber>-NN,<summary>,<High|Medium|Low>,<step 1 text>,<expected result>,<STORY>,Manual,,,NR,<Creator>`
  - `Test Id` zero-padded & sequential; `Summary` present-tense, specific; `Story` = the
    story id; `Component`/`Release` blank; `Status` = `NR`; `Creator` = the engineer.
  - **Step 1 goes on this row** (in `TestSteps`), and the case-level `ExpectedResults` too.
- **Extra step rows (steps 2, 3, …):** one row each, **verbatim shape**:
  ```
  ,,,<step text>, ,,,,,,,
  ```
  three empty leading fields, the step text in `TestSteps`, a **single space** in
  `ExpectedResults`, then the trailing commas (JF-759's step rows are 12 fields — keep the
  trailing comma; do not "fix" it to 11).

## Hard rules — what makes it import vs fail
- **Plain UTF-8, NO BOM, LF line endings.** Not CRLF, not a BOM. (The BOM+CRLF+27-column
  format failed to import.)
- **No double-quotes anywhere.** Do not quote fields — therefore **fields must contain no
  commas**: rephrase to avoid a comma (or use `;`) rather than quoting. A quoted field is the
  other thing that breaks the import.
- Keep Arabic text as-is (UTF-8).
- One `ExpectedResults` per case (on the case row); step rows carry only the step text + the
  single space.

## Validate before handing off
Diff the shape against `JF-759_Test_Cases_AIO.csv`: 11-column header, **no BOM**, **LF**
endings, **zero `"` characters**, case rows = 11 fields, step rows follow `,,,<step>, ,,,,,,,`.
Row count = (cases) + (extra step rows). Ideally trial-import into a scratch AIO cycle, then
hand off to `/stlc-test-case-review`.
