/**
 * Whole-backlog coverage generator.
 * Reads the full JF issue export and emits one skeleton spec per STORY into
 * tests-backlog/<area>/<KEY>.spec.ts — dev-complete stories get runnable
 * placeholders wired to the pack's fixtures; not-yet-developed stories get
 * test.fixme() skeletons carrying their acceptance summary, so the pack grows
 * into full-system coverage as development lands.
 *
 * Bugs are attached to their story's file as extra scenarios (regression guards).
 * Re-run any time: `node generate-backlog-coverage.ts` (Node 24 type-stripping; idempotent, overwrites).
 * Standalone Node script (CommonJS), so require() is used rather than import.
 */
const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description?: unknown;
    issuetype: { name: string };
    status: { name: string };
  };
}

const ALL: JiraIssue[] = JSON.parse(
  fs.readFileSync('C:/Users/Admin/Desktop/JF-QA-Full-Cycle/system-docs/raw/all-issues.json', 'utf8'),
);

// Checked in order — most specific first; admin is the near-fallback because its
// vocabulary (user/task/مهمة) appears everywhere.
const AREAS: Array<{ name: string; match: RegExp }> = [
  { name: '08-public', match: /qr|تحقق من صحة خطاب/i },
  { name: '03-sp-lifecycle', match: /facility|منشأة|منشآت|service provider|مزود الخدمة|خدمة جديدة|services list|قائمة الخدمات|service registration|purchasing|المشتريات/i },
  { name: '05-heirs', match: /heir|وريث|ورثة|إقرار|افصاح|إفصاح|disclosure|admission|مفصح/i },
  { name: '06-assets-classification', match: /أصل|أصول|اصول|asset|classification|تصنيف|readiness|ربط الأصول|valuation|تقييم المؤتمت|مركبة|vehicle/i },
  { name: '07-liquidator', match: /liquidator|مصفي|تصفية|إسناد|اسناد|correspondence|مخاطب|legal|قانوني|قضايا|قضية|استفسار|erp|journal|قيود|لوحة معلومات|dashboard/i },
  { name: '01-auth', match: /login|نفاذ|تسجيل الدخول|nafath|password|otp|كلمة المرور/i },
  { name: '04-estate-core', match: /estate|تركة|تركات|referral|إحالة|احالة|صك|deed|استعلام|inquiry|بنك|sama|cma|عقار|بورصة|مالي|financial|مدير|events log|سجل/i },
  { name: '02-admin', match: /user|role|مستخدم|دور|صلاحي|task|مهمة|مهام|flow|خريطة|خرائط|حقول|field|template|قالب|لوحة التحكم|notification|tenant/i },
];
const DEV_COMPLETE = new Set(['Ready for QA', 'QA', 'Ready For UAT', 'UAT', 'Reopened', 'Blocked']);

const descText = (d: unknown): string => {
  if (!d) return '';
  if (typeof d === 'string') return d;
  const parts: string[] = [];
  (function walk(n: any): void {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.text) parts.push(n.text);
    if (n.content) walk(n.content);
  })(d);
  return parts.join(' ');
};

const areaOf = (text: string): string =>
  (AREAS.find((a) => a.match.test(text)) || { name: '99-uncategorized' }).name;
const esc = (s: string): string =>
  (s || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '$\\{');

const stories = ALL.filter((n) => n.fields.issuetype.name !== 'Bug');
const bugs = ALL.filter((n) => n.fields.issuetype.name === 'Bug');

// naive bug→story linkage: bug summary/description mentioning "JF-<n>" or sharing labels
const bugsByStory: Record<string, JiraIssue[]> = {};
for (const b of bugs) {
  const text = `${b.fields.summary} ${descText(b.fields.description)}`;
  const refs = [...new Set((text.match(/JF-\d+/g) || []).filter((k) => k !== b.key))];
  const target = refs.find((r) => stories.some((s) => s.key === r));
  const bucket = target || '__unlinked__';
  (bugsByStory[bucket] = bugsByStory[bucket] || []).push(b);
}

const outRoot = path.join(__dirname, 'tests-backlog');
fs.rmSync(outRoot, { recursive: true, force: true });
let files = 0;
let scenarios = 0;

for (const s of stories) {
  const f = s.fields;
  const text = `${f.summary} ${descText(f.description).slice(0, 500)}`;
  const area = areaOf(text);
  const dir = path.join(outRoot, area);
  fs.mkdirSync(dir, { recursive: true });
  const devDone = DEV_COMPLETE.has(f.status.name);
  const linkedBugs = bugsByStory[s.key] || [];
  // Every story carries all THREE coverage layers so the whole-system map mirrors the
  // FE + BE(API) + DB model of the other packs. Each layer is a test.fixme skeleton
  // (features here are not built yet) tagged @fe / @be / @db and annotated with the story.
  const kw = (f.summary + ' ' + descText(f.description).slice(0, 300)).toLowerCase();
  const hasUi = !/erp|integration|webhook|\bapi\b|journal|posting|dimension/.test(kw); // ERP/integration stories are BE/DB-only
  const fmt = (n: string): string => esc(n).replace(/'/g, "\\'");
  const lines = [
    `import { test, expect } from '@playwright/test';`,
    '',
    '/**',
    ` * ${s.key} — ${f.summary}`,
    ` * Jira status at generation: ${f.status.name} (${devDone ? 'dev-complete' : 'NOT developed yet'})`,
    ` * Coverage layers: FE (UI) + BE (API) + DB verification. Fill each from the ACs.`,
    ` * Full story text: JF-QA-Full-Cycle/system-docs/issues/${s.key}-*.md`,
    ' */',
    `test.describe('${s.key} ${fmt(f.summary)}', () => {`,
  ];
  if (hasUi) {
    lines.push(
      `  // FE (UI): drive the real screen for this story through the browser.`,
      `  test.fixme('@fe ${s.key} — UI: user completes the flow on screen', async ({ page }) => {`,
      `    // TODO(${s.key}/FE): navigate the screen(s) and assert the ACs via getByRole/getByTestId.`,
      `    test.info().annotations.push({ type: 'story', description: '${s.key}' });`,
      `    test.info().annotations.push({ type: 'layer', description: 'fe' });`,
      `  });`,
    );
    scenarios++;
  }
  lines.push(
    `  // BE (API): assert the endpoint contract / RBAC / data shape behind this story.`,
    `  test.fixme('@be ${s.key} — API: endpoint contract & rules', async () => {`,
    `    // TODO(${s.key}/BE): call the story's API (src/helpers/api.ts) and assert status + payload.`,
    `    test.info().annotations.push({ type: 'story', description: '${s.key}' });`,
    `    test.info().annotations.push({ type: 'layer', description: 'be' });`,
    `  });`,
    `  // DB: verify persisted state (SELECT-only, env-gated on CB_*).`,
    `  test.fixme('@db ${s.key} — DB: persisted state matches', async () => {`,
    `    // TODO(${s.key}/DB): guard with dbAvailable(); SELECT the affected row(s) and assert (src/db.ts).`,
    `    test.info().annotations.push({ type: 'story', description: '${s.key}' });`,
    `    test.info().annotations.push({ type: 'layer', description: 'db' });`,
    `  });`,
  );
  scenarios += 2;
  for (const b of linkedBugs) {
    const open = !['Ready For UAT', 'UAT', 'Rejected'].includes(b.fields.status.name);
    lines.push(
      '',
      `  // ${b.key} [${b.fields.status.name}] ${esc(b.fields.summary).replace(/'/g, "\\'").slice(0, 110)}`,
      `  test.fixme('regression guard for ${b.key}${open ? ' (bug still open)' : ' (verify fix)'}', async ({ page }) => {`,
      `    test.info().annotations.push({ type: 'bug', description: '${b.key}' });`,
      `  });`,
    );
    scenarios++;
  }
  lines.push('});', '');
  fs.writeFileSync(path.join(dir, `${s.key}.spec.ts`), lines.join('\n'));
  files++;
}

const unlinked = bugsByStory['__unlinked__'] || [];
if (unlinked.length) {
  const dir = path.join(outRoot, '99-uncategorized');
  fs.mkdirSync(dir, { recursive: true });
  const lines = [
    `import { test } from '@playwright/test';`,
    '',
    '// Bugs that could not be auto-linked to a story — triage into the right spec.',
    `test.describe('Unlinked bug regression guards', () => {`,
  ];
  for (const b of unlinked) {
    lines.push(
      `  // ${b.key} [${b.fields.status.name}]`,
      `  test.fixme('${b.key} ${esc(b.fields.summary).replace(/'/g, "\\'").slice(0, 100)}', async () => {});`,
    );
    scenarios++;
  }
  lines.push('});', '');
  fs.writeFileSync(path.join(dir, '__unlinked-bugs.spec.ts'), lines.join('\n'));
  files++;
}

console.log(`generated ${files} spec files, ${scenarios} scenarios, unlinked bugs: ${unlinked.length}`);
