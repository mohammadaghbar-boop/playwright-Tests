# AIO Test — CSV import format

**Match AIO's native exported schema exactly** — that is what the AIO importer accepts. The
earlier 11-column template (`Test Id,Summary,…,Creator`, one row per step, LF, no BOM) did
**not** import — it was hand-made and is now retired. Ground truth is a real AIO export
(`AIO_CASE_*_Export_*.csv`): **27 columns, UTF-8 with BOM, CRLF line endings, and all steps
in one multi-line cell** (not one row per step).

## Header (row 1, verbatim — 27 columns)
```
S.NO.,Key,Version,Title,Description,Pre-condition,Datasets/Examples,BDDKeyword,Steps,Data,Expected Result,Folder,Requirements,Owner,Priority,Status,Type,Releases,Components,Estimated Effort(in mins),Tags,Automation Status,Automation Owner,Automation Key,Case Created,Version Created,Updated
```

## What to fill (new cases, on import)
| Column | Fill with |
|--------|-----------|
| S.NO. | running number (1, 2, 3 …) — informational |
| Key | **blank** — AIO assigns the `JF-TC-####` key on import |
| Version | `1` |
| Title | case title — **must begin with "Verify"** |
| Description | one-line description |
| Pre-condition | preconditions / required state |
| Datasets/Examples | blank |
| BDDKeyword | blank |
| Steps | **all steps in ONE quoted cell**, numbered & newline-separated: `"1. …⏎2. …⏎3. …"` |
| Data | test data / record IDs |
| Expected Result | **one quoted cell**, numbered to match each step: `"1. …⏎2. …"` |
| Folder | optional AIO folder (e.g. `$story`); else blank |
| Requirements | the story key (e.g. `JF-575`) to link the requirement |
| Owner | authoring engineer |
| Priority | AIO's priority values (typically `Highest`/`High`/`Medium`/`Low`/`Lowest`). Map **Risk**: Critical→Highest, High→High, Medium→Medium, Low→Low |
| Status | blank (AIO defaults the case status; run-status lives in the cycle, not here) |
| Type | `Manual` (or `Automated` once automated) |
| Releases, Components, Estimated Effort(in mins) | blank / optional |
| Tags | optional — carry the **risk level** (e.g. `risk:Critical`) and any `@blocked-JFxxx` |
| Automation Status, Automation Owner, Automation Key | blank |
| Case Created, Version Created, Updated | blank (AIO sets) |

## Encoding & line endings — the actual cause of the earlier import failure
- Write **UTF-8 with BOM** and **CRLF** line endings (exactly what AIO exports). A UTF-8
  file **without** BOM and with **LF-only** endings is the format that failed to import,
  especially with Arabic text.
- Any field containing a comma, quote, or newline **must be double-quoted**; escape an
  embedded quote by doubling it (`""`). The `Steps` and `Expected Result` cells are always
  quoted (they contain newlines).
- Keep Arabic text as-is (UTF-8).
- The `Write` tool does not emit a BOM/CRLF by itself — after writing, **post-process** to add
  the BOM and convert to CRLF (a tiny node/`sed` step) and verify before handing off.

## Multi-step model (changed from the retired format)
**One row per case.** All steps go in the single quoted `Steps` cell as a numbered list; the
matching outcomes go in the single quoted `Expected Result` cell with the same numbering. Do
**not** emit one row per step.

## Validate before handing off
Confirm: BOM present, CRLF endings, 27 columns on every row, `Steps`/`Expected Result` quoted
and numbered — and ideally a **trial import into a scratch AIO cycle** to confirm it lands,
before `/stlc-test-case-review`.
