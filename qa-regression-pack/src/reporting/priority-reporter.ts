import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

type Priority = 'BLOCKER' | 'HIGH' | 'MEDIUM';

interface Row {
  title: string;
  file: string;
  priority: Priority;
  status: string;
  knownIssue?: string;
  error?: string;
}

/**
 * Groups results by priority tag (@blocker/@high/@medium in the test title) and
 * separates NEW failures from KNOWN ones (annotated via annotateKnownIssue).
 * Output: regression-report.md next to playwright.config.ts.
 *
 * Release rule encoded here:
 *   any NEW @blocker failure  -> "NO-GO"
 *   otherwise                 -> "GO (with defects to raise)" / "GO"
 */
class PriorityReporter implements Reporter {
  // Keyed by test id so retries overwrite rather than duplicate — the last
  // attempt is what counts (a test that passes on retry is a pass).
  private byId = new Map<string, Row>();

  onTestEnd(test: TestCase, result: TestResult): void {
    const title = test.titlePath().slice(2).join(' › ');
    const priority: Priority = /@blocker/.test(title) ? 'BLOCKER' : /@high/.test(title) ? 'HIGH' : 'MEDIUM';
    const known = test.annotations.find((a) => a.type === 'known-issue')?.description;
    this.byId.set(test.id, {
      title,
      file: path.basename(test.location.file),
      priority,
      status: result.status,
      knownIssue: known,
      error: result.error?.message?.split('\n')[0],
    });
  }

  onEnd(result: FullResult): void {
    const allRows = [...this.byId.values()];
    const failed = allRows.filter((r) => r.status !== 'passed' && r.status !== 'skipped');
    const newFailures = failed.filter((r) => !r.knownIssue);
    const knownFailures = failed.filter((r) => r.knownIssue);
    const fixedCandidates = allRows.filter((r) => r.status === 'passed' && r.knownIssue);
    const gate = newFailures.some((r) => r.priority === 'BLOCKER')
      ? 'NO-GO — new blocker regression(s)'
      : newFailures.length
        ? 'GO — but raise the defects below'
        : 'GO';

    const byPriority = (list: Row[], p: Priority) => list.filter((r) => r.priority === p);
    const lines: string[] = [
      '# JF Regression Report',
      '',
      `Run finished: ${new Date().toISOString()} — overall: **${result.status}**`,
      '',
      `## Release verdict: **${gate}**`,
      '',
      `Total: ${allRows.length} | Passed: ${allRows.filter((r) => r.status === 'passed').length} | Failed: ${failed.length} (new: ${newFailures.length}, known: ${knownFailures.length}) | Skipped: ${allRows.filter((r) => r.status === 'skipped').length}`,
      '',
    ];
    for (const p of ['BLOCKER', 'HIGH', 'MEDIUM'] as Priority[]) {
      const group = byPriority(newFailures, p);
      if (!group.length) continue;
      lines.push(`## NEW ${p} failures (${group.length})`, '');
      group.forEach((r) => lines.push(`- **${r.title}** (${r.file}) — ${r.error ?? r.status}`));
      lines.push('');
    }
    if (knownFailures.length) {
      lines.push(`## Known-issue failures (${knownFailures.length}) — already tracked in Jira`, '');
      knownFailures.forEach((r) => lines.push(`- ${r.title} → ${r.knownIssue}`));
      lines.push('');
    }
    if (fixedCandidates.length) {
      lines.push('## Possibly fixed — verify & remove from known-issues.ts', '');
      fixedCandidates.forEach((r) => lines.push(`- ${r.title} → ${r.knownIssue}`));
      lines.push('');
    }
    const out = path.resolve(__dirname, '..', '..', 'regression-report.md');
    fs.writeFileSync(out, lines.join('\n'));
    console.log(`\n[priority-reporter] ${gate} — report: ${out}\n`);
  }
}

export default PriorityReporter;
