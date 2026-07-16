/**
 * Deterministic, human-readable UUIDs for fixture rows.
 *
 * Fixture ids must be stable across regeneration: `supabase/seed.sql` and the MSW
 * fixtures are built from this same source, and a test asserting parity between
 * them compares ids. Random ids would also mean every `bun run seed:gen` produces
 * a diff of 500 changed lines that reviews as noise.
 *
 * The layout encodes what a row is, so an id in a failing test or a psql result is
 * readable on sight: `00000009-0000-4000-8000-000000000042` is ticket #42. That is
 * worth more here than the entropy a real v4 would carry — nothing about fixture
 * data needs to be unguessable.
 *
 * Version/variant nibbles are set so the value is a well-formed v4 and Postgres,
 * Zod (`z.uuid()`) and any client-side parser all accept it.
 */

export const FIXTURE_NAMESPACE = {
  user: 1,
  role: 2,
  permission: 3,
  team: 4,
  category: 5,
  tag: 6,
  slaPolicy: 7,
  cannedResponse: 8,
  ticket: 9,
  ticketMessage: 10,
  ticketEvent: 11,
} as const;

export type FixtureNamespace = keyof typeof FIXTURE_NAMESPACE;

/**
 * `fixtureUuid('ticket', 42)` → `00000009-0000-4000-8000-000000000042`.
 *
 * @param namespace which table the row belongs to — becomes the first block
 * @param index     1-based row number within that table — becomes the last block
 */
export function fixtureUuid(namespace: FixtureNamespace, index: number): string {
  const namespaceBlock = FIXTURE_NAMESPACE[namespace].toString(16).padStart(8, '0');
  const indexBlock = index.toString(16).padStart(12, '0');

  // 4 = version, 8 = variant. Both fixed so the result parses as a v4 UUID.
  return `${namespaceBlock}-0000-4000-8000-${indexBlock}`;
}
