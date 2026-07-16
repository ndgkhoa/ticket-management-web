/**
 * Fails when `supabase/seed.sql` no longer matches the fixtures it is generated
 * from.
 *
 * The seed is committed so `supabase db reset` works on a fresh clone, which means
 * it can go stale: edit a fixture, forget `bun run seed:gen`, and the database gets
 * yesterday's data while MSW serves today's. That breaks the one property the data
 * layer is built on — that both sources answer identically — and it breaks it
 * silently, in the direction where mocked tests still pass.
 *
 * Mirrors `lang:check`, which guards the locale files the same way.
 *
 * Usage: bun run seed:check
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(scriptDir, '../supabase/seed.sql');

const committed = readFileSync(seedPath, 'utf8');

// Regenerate over the committed file, then compare and restore. The generator
// writes to a fixed path by design — a second "write somewhere else" code path in
// the generator would itself be a thing that can drift.
execFileSync('bun', [resolve(scriptDir, 'generate-seed-sql.ts')], { stdio: 'pipe' });

const regenerated = readFileSync(seedPath, 'utf8');

if (committed !== regenerated) {
  // Put the committed version back so a failing check does not leave a dirty tree
  // that looks like the developer's own change.
  const { writeFileSync } = await import('node:fs');
  writeFileSync(seedPath, committed, 'utf8');

  console.error(
    'supabase/seed.sql is out of sync with src/mocks/fixtures.\n' +
      'Run `bun run seed:gen` and commit the result.'
  );
  process.exit(1);
}

console.log('supabase/seed.sql is in sync with the fixtures.');
