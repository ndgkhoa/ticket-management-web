import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(scriptDir, '../supabase/seed.sql');

const committed = readFileSync(seedPath, 'utf8');

execFileSync('bun', [resolve(scriptDir, 'generate-seed-sql.ts')], { stdio: 'pipe' });

const regenerated = readFileSync(seedPath, 'utf8');

if (committed !== regenerated) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(seedPath, committed, 'utf8');

  console.error(
    'supabase/seed.sql is out of sync with src/mocks/fixtures.\n' +
      'Run `bun run seed:gen` and commit the result.'
  );
  process.exit(1);
}

console.log('supabase/seed.sql is in sync with the fixtures.');
