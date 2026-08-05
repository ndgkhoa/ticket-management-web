const EXCLUDED_DIRS = ['src/i18n/locales/', 'src/testing/', 'src/mocks/', 'src/routes/'];

const EXCLUDED_FILES = ['src/routeTree.gen.ts', 'src/lib/database.types.ts', 'src/main.tsx'];

const EXCLUDED_SUFFIXES = [/\.(test|spec)\.tsx?$/, /\.stories\.tsx$/, /\.d\.ts$/];

module.exports = {
  name: 'E2E Coverage',
  outputDir: './coverage-e2e',
  reports: [['lcovonly'], ['console-summary']],
  entryFilter: (entry) => entry.url.includes('/assets/') && entry.url.endsWith('.js'),
  sourceFilter: (sourcePath) => {
    const path = sourcePath.replace(/\\/g, '/');
    if (path.includes('node_modules')) return false;

    const start = path.lastIndexOf('src/');
    if (start === -1) return false;

    const file = path.slice(start);
    if (EXCLUDED_DIRS.some((dir) => file.startsWith(dir))) return false;
    if (EXCLUDED_FILES.includes(file)) return false;
    return !EXCLUDED_SUFFIXES.some((pattern) => pattern.test(file));
  },
};
