# AIO Test — CSV import format

Derived from the working template `JF-172_Test_Cases_AIO.csv`. Match it exactly.

## Header (row 1, verbatim)
```
Test Id,Summary,Priority,TestSteps,ExpectedResults,Story,Test Type,Component,Release,Status,Creator
```

## Columns
| Column | Meaning | Notes |
|--------|---------|-------|
| Test Id | Case id, e.g. `TC-172-01` | `TC-<storyNumber>-<NN>`, zero-padded, sequential |
| Summary | One-line title | present tense, specific |
| Priority | `High` / `Medium` / `Low` | |
| TestSteps | One step | see multi-step rule below |
| ExpectedResults | Expected outcome of the case | on the first row of the case |
| Story | e.g. `JF-172` | the story id |
| Test Type | `Manual` | (use `Manual` unless told otherwise) |
| Component | usually blank | |
| Release | usually blank | |
| Status | `NR` (Not Run) | initial import state |
| Creator | e.g. `Ahmad Altwaam` | the authoring engineer |

## Multi-step cases
The first row carries all columns. **Each additional step is its own row with only the
`TestSteps` column filled** (all other columns empty). Example:

```
TC-172-01,Process starts after a valid rank is saved,High,Classify an estate and save a rank,The process starts immediately after the rank is saved,JF-172,Manual,,,NR,Ahmad Altwaam
,,,Observe whether the process starts after the rank is saved,,,,,,,
```

## Gotchas
- No commas inside unquoted fields — rephrase or quote the field.
- Keep Arabic text as-is (UTF-8).
- Row count in the file = (number of cases) + (number of extra step rows).
