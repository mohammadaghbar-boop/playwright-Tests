# Classification taxonomy — decision guide

Use one label per case. When torn, prefer the label that best drives the right next action.

| Label | Meaning | Next action |
|-------|---------|-------------|
| **Passed** | Matches acceptance criteria; verified with evidence | none |
| **Failed** | Product behaves **incorrectly** against a clear AC | `/stlc-defect-log` → bug |
| **Gap** | Behaviour/criterion **undefined or incomplete** (not wrong — missing/unclear) | `/stlc-defect-log` → bug/clarification, link to story |
| **Not Applicable** | Case doesn't apply to this build/config/scope | note why; no defect |
| **Requires dev support** | Untestable even with all our access (needs backend config or test data only devs can create) | note exactly what's needed; escalate |

## Failed vs Gap — the common confusion
- **Failed** = "the feature exists and does the wrong thing."
- **Gap** = "the feature/criterion isn't there or isn't defined enough to judge."
  Example: a filter that the story implies but that returns an empty options endpoint =
  Gap (pending development), not Failed.

## Requires-investigation → always resolves to one of the five
"Requires further investigation" is a *run-time* holding state from `/stlc-run`. By the end
of classification, every such case must land on one of the five labels above, with the
investigation recorded.

## Evidence
Every Failed/Gap classification must cite text/trace/screenshot evidence.
