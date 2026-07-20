module.exports = {
  name: 'E2E Coverage',
  outputDir: './coverage-e2e',
  reports: [['lcovonly'], ['console-summary']],
  entryFilter: (entry) => entry.url.includes('/assets/') && entry.url.endsWith('.js'),
  sourceFilter: (sourcePath) =>
    sourcePath.includes('src/') &&
    !sourcePath.includes('node_modules') &&
    !sourcePath.includes('routeTree.gen') &&
    !sourcePath.includes('database.types'),
};
