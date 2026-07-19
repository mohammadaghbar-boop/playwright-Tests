/**
 * Registry of open JF bugs that regression specs may hit.
 * A spec that asserts behavior broken by one of these should call
 * `annotateKnownIssue(test, 'JF-xxx')` so the priority reporter classifies its
 * failure as KNOWN (with the bug key) instead of a NEW regression.
 *
 * Source of truth: JF-QA-Full-Cycle/system-docs/analysis/bugs-known-issues.md
 * Review this list after every bug-fix deployment and remove closed keys —
 * a KNOWN entry whose spec starts passing is flagged by the reporter as
 * "possibly fixed — verify & remove".
 */
export interface KnownIssue {
  key: string;
  title: string;
  area: string;
  blocking: boolean;
}

export const KNOWN_ISSUES: Record<string, KnownIssue> = {
  'JF-305': { key: 'JF-305', title: 'Real-estate asset details missing Deed/Property sections', area: 'assets', blocking: true },
  // JF-340: round-2 workflow re-test (2026-07-16) — assigning a PUBLISHED task to an
  // ACTIVE flow map now returns 200 (decision-points POST); the 400
  // DECISION_POINT_TASK_NOT_FOUND_OR_INACTIVE now only fires for genuinely
  // missing/inactive tasks. Appears FIXED; kept until Jira confirms closure.
  'JF-340': { key: 'JF-340', title: 'Cannot assign task to active Flow Map (400) (appears fixed 2026-07-16)', area: 'flow-maps', blocking: true },
  'JF-352': { key: 'JF-352', title: 'Asset sub-type dropdown shows placeholder stubs', area: 'assets', blocking: true },
  // JF-359: empty-classifier save now blocked with per-field validation on
  // 2026-07-16 — appears fixed, kept until Jira confirms closure.
  'JF-359': { key: 'JF-359', title: 'Flowchart templates save with empty classifier fields (appears fixed 2026-07-16)', area: 'flow-maps', blocking: true },
  'JF-450': { key: 'JF-450', title: 'View action missing from Users list', area: 'admin', blocking: false },
  'JF-561': { key: 'JF-561', title: 'No escalation when no active managers exist', area: 'estate-core', blocking: true },
  'JF-565': { key: 'JF-565', title: 'Head EM 403 on Heirs Confirmation screen', area: 'heirs', blocking: true },
  'JF-726': { key: 'JF-726', title: 'SignalR CORS — inquiry statuses stuck قيد المعالجة', area: 'estate-core', blocking: true },
  'JF-727': { key: 'JF-727', title: '500 on upload-chunked — disclosure attachments', area: 'heirs', blocking: true },
  // JF-740: did not reproduce for a registered heir on 2026-07-16 (dashboard +
  // mainHub WebSocket both healthy); appears fixed, kept until Jira confirms.
  'JF-740': { key: 'JF-740', title: 'SignalR CORS — heir dashboard never loads (appears fixed 2026-07-16)', area: 'heirs', blocking: true },
  'JF-741': { key: 'JF-741', title: 'auth/token 404 after registration OTP', area: 'heirs', blocking: true },
  'JF-750': { key: 'JF-750', title: 'Internal user creation captures no national ID', area: 'admin', blocking: true },
  'JF-757': { key: 'JF-757', title: 'Disclosure with attachment silently stuck as draft', area: 'heirs', blocking: true },
  'JF-828': { key: 'JF-828', title: 'Service wizard step-6 certificate popup unusable', area: 'sp-lifecycle', blocking: true },
  // JF-830: during the 2026-07-16 cycle upload-chunked returned 201 with CORS header
  // present — appears FIXED. Kept here until Jira confirms closure; the reporter will
  // flag any annotated spec that now passes as "possibly fixed — verify & remove".
  'JF-830': { key: 'JF-830', title: 'CORS blocks upload-chunked — service registration (appears fixed 2026-07-16)', area: 'sp-lifecycle', blocking: true },
  'JF-832': { key: 'JF-832', title: 'File downloads time out (internal OSS URLs)', area: 'attachments', blocking: true },
  'JF-852': { key: 'JF-852', title: 'Facility attachments/logo unreachable OSS endpoint', area: 'sp-lifecycle', blocking: true },
  'JF-927': { key: 'JF-927', title: 'Asset readiness non-deterministic, fail-open', area: 'assets', blocking: true },
  'JF-1058': { key: 'JF-1058', title: 'Classification estimatedValueImpact constant — ranks A/B unreachable', area: 'classification', blocking: true },
  'JF-263': { key: 'JF-263', title: 'Duplicate referral technicalReferenceId returns 200 not 409', area: 'estate-core', blocking: false },
  'JF-829': { key: 'JF-829', title: 'Service-registration site-config request aborts (ERR_ABORTED)', area: 'sp-lifecycle', blocking: false },
  'JF-1059': { key: 'JF-1059', title: 'Facility create POSTs return 200 instead of 201', area: 'sp-lifecycle', blocking: false },
  // Filed 2026-07-16 from the QA cycle (assigned Saeed). Titles below are the QA summaries.
  'JF-1097': { key: 'JF-1097', title: '[DB Migration Regression] site-config/* all return 500 — blocks service registration / liquidator onboarding', area: 'platform', blocking: true },
  'JF-1098': { key: 'JF-1098', title: '[DB Migration Regression] task deactivate -> 500', area: 'admin', blocking: true },
  'JF-1099': { key: 'JF-1099', title: '[DB Migration Regression] task delete -> 500', area: 'admin', blocking: true },
  'JF-1100': { key: 'JF-1100', title: '[DB Migration Regression] AVM per-asset value never stored', area: 'estate-core', blocking: false },
  'JF-1101': { key: 'JF-1101', title: 'Marjea inquiry returns 0 vehicles', area: 'estate-core', blocking: false },
  'JF-1102': { key: 'JF-1102', title: 'Inquiry recipient-close fires no request', area: 'liquidator', blocking: false },
};

import type { TestType } from '@playwright/test';

/** Annotate the current test as affected by a known open bug. */
export function annotateKnownIssue(test: TestType<any, any>, key: string): void {
  const issue = KNOWN_ISSUES[key];
  test.info().annotations.push({
    type: 'known-issue',
    description: issue ? `${issue.key}: ${issue.title}` : key,
  });
}
