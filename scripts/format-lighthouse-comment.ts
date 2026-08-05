import fs from 'fs';
import path from 'path';

const REPORTS_DIR = '.lighthouseci';
const OUTPUT_FILE = process.argv[2] ?? 'lighthouse-comment.md';

const CATEGORIES = [
  { key: 'performance', label: 'Performance', minScore: 0.9 },
  { key: 'accessibility', label: 'Accessibility', minScore: 0.95 },
  { key: 'best-practices', label: 'Best Practices', minScore: 0.9 },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];
type Scores = Record<CategoryKey, number[]>;

type Lhr = {
  requestedUrl?: string;
  finalDisplayedUrl?: string;
  finalUrl?: string;
  categories?: Record<string, { score: number | null }>;
};

const emptyScores = (): Scores => ({ performance: [], accessibility: [], 'best-practices': [] });

const collect = (): Map<string, Scores> => {
  const byUrl = new Map<string, Scores>();
  if (!fs.existsSync(REPORTS_DIR)) return byUrl;

  const files = fs.readdirSync(REPORTS_DIR).filter((file) => /^lhr-.*\.json$/.test(file));

  for (const file of files) {
    const lhr = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf8')) as Lhr;
    const url = lhr.requestedUrl ?? lhr.finalDisplayedUrl ?? lhr.finalUrl;
    if (!url) continue;

    const scores = byUrl.get(url) ?? emptyScores();
    byUrl.set(url, scores);

    for (const { key } of CATEGORIES) {
      const score = lhr.categories?.[key]?.score;
      if (typeof score === 'number') scores[key].push(score);
    }
  }

  return byUrl;
};

const median = (scores: number[]): number | null => {
  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const cell = (score: number | null, minScore: number): string => {
  if (score === null) return '—';
  const value = Math.round(score * 100);
  return `${score >= minScore ? '✅' : '⚠️'} ${value}`;
};

const pathname = (url: string): string => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const byUrl = collect();

if (byUrl.size === 0) {
  console.log(`No Lighthouse reports in ${REPORTS_DIR}/; skipping comment.`);
  process.exit(0);
}

const rows = [...byUrl]
  .map(
    ([url, scores]) =>
      `| \`${pathname(url)}\` | ${CATEGORIES.map((c) => cell(median(scores[c.key]), c.minScore)).join(' | ')} |`
  )
  .join('\n');

const body = [
  '## Lighthouse Report',
  '',
  `| Page | ${CATEGORIES.map((c) => c.label).join(' | ')} |`,
  `|---|${CATEGORIES.map(() => '---').join('|')}|`,
  rows,
  '',
].join('\n');

fs.writeFileSync(OUTPUT_FILE, body);
console.log(`Wrote ${OUTPUT_FILE} (${byUrl.size} page(s)).`);
