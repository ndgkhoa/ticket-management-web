/**
 * The single fixture source.
 *
 * Two consumers, one dataset:
 *   - `scripts/generate-seed-sql.ts` renders these rows into `supabase/seed.sql`
 *   - the MSW handlers answer from them directly
 *
 * That is what makes "same params → same response from Supabase and MSW" a
 * testable claim rather than a hope. Fixtures written separately from the seed
 * drift within a week, and the drift surfaces as a test that passes against mocks
 * and a demo that breaks against the database.
 */

export * from './fixture-uuid';
export * from './organization';
export * from './people';
export * from './rbac';
export * from './row-types';
export * from './tickets';
