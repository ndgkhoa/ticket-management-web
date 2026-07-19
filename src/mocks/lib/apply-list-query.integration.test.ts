import { createClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { listParamsSchema, type ListParams } from '~/lib/list-query';
import { applyListQuery } from '~/mocks/lib/apply-list-query';
import { ticketListConfig } from '~/mocks/config/ticket-list-config';
import { ticketRows } from '~/mocks/fixtures';
// Type-only: erased at runtime, so importing it does not load the module before the
// beforeAll doMock repoints its supabase client.
import type { ticketApi as ImportedTicketApi } from '~/features/tickets/api/ticket-api';

/**
 * The parity guard: the MSW applier and the live Supabase query must return the same
 * `{ rows, totalCount, pageCount }` for the same params — filter, search and sort
 * combined. If they drift, one is wrong, and the demo (MSW) would disagree with
 * production (Supabase) exactly where a test can't see it.
 *
 * This needs the local Supabase stack, so it is excluded from the default suite and
 * skipped unless RUN_INTEGRATION is set (`bun run test:parity`). CI's unit job has no
 * database; this belongs to a Supabase-enabled run.
 */
// `process` isn't in the app's tsconfig types, so reach it structurally rather than
// pulling node globals into the whole project for one env read.
const RUN = Boolean(
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.RUN_INTEGRATION
);

const URL = 'http://127.0.0.1:54321';
// The fixed local-dev anon key — identical on every machine, not a secret.
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const CASES: Record<string, Partial<ListParams>> = {
  default: {},
  'filter status=open': { filters: { status: 'open' } },
  'filter priority in [high,urgent]': { filters: { priority: ['high', 'urgent'] } },
  'filter status=open + priority=urgent': { filters: { status: 'open', priority: 'urgent' } },
  'sort priority asc (enum order)': { sort: { field: 'priority', dir: 'asc' } },
  'sort priority desc': { sort: { field: 'priority', dir: 'desc' } },
  'sort status asc (enum order)': { sort: { field: 'status', dir: 'asc' } },
  'search q=refund (FTS)': { q: 'refund' },
  'search q=invoice (FTS)': { q: 'invoice' },
  'search q=payme (FTS miss -> trgm)': { q: 'payme' },
  'search q=in (short -> trgm)': { q: 'in' },
  'search q=time-sensitive (hyphenated)': { q: 'time-sensitive' },
  'sort due_at desc (nullable column)': { sort: { field: 'due_at', dir: 'desc' } },
  'page 2': { page: 2 },
  'page beyond last': { page: 999 },
  'combined: open + sort priority desc + page 1': {
    filters: { status: 'open' },
    sort: { field: 'priority', dir: 'desc' },
  },
  'combined: search + filter + sort': {
    filters: { status: 'solved' },
    q: 'refund',
    sort: { field: 'priority', dir: 'desc' },
  },
  'combined: search + sort + page 2': {
    q: 'invoice',
    sort: { field: 'priority', dir: 'desc' },
    page: 2,
    pageSize: 10,
  },
};

describe.skipIf(!RUN)('list-query parity: MSW applier vs live Supabase', () => {
  let ticketApi: typeof ImportedTicketApi;

  beforeAll(async () => {
    const { server } = await import('~/mocks/server');
    server.close();

    const client = createClient(URL, ANON);
    const { error } = await client.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'password123',
    });
    if (error) throw new Error(`admin sign-in: ${error.message}`);

    // Point the ticket api at the signed-in admin client (sees all 500 — no RLS
    // scoping — so it compares against the full fixture set the applier runs over).
    vi.doMock('~/lib/supabase', () => ({ supabase: client }));
    ({ ticketApi } = await import('~/features/tickets/api/ticket-api'));
  });

  it.each(Object.entries(CASES))('%s', async (_name, partial) => {
    const params = listParamsSchema.parse(partial);

    const supabaseResult = await ticketApi.list(params);
    const mswResult = applyListQuery(ticketRows, params, ticketListConfig);

    expect(mswResult.totalCount).toBe(supabaseResult.totalCount);
    expect(mswResult.pageCount).toBe(supabaseResult.pageCount);
    expect(mswResult.rows.map((r) => r.id)).toEqual(supabaseResult.rows.map((r) => r.id));
  });
});
