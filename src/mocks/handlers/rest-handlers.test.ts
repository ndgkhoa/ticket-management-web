import { describe, expect, it } from 'vitest';

import { listParamsSchema, type ListParams } from '~/lib/list-query';
import { applyListQuery } from '~/mocks/lib/apply-list-query';
import { ticketListConfig } from '~/mocks/config/ticket-list-config';
import { permissionRows, roleRows, ticketRows, ticketTagRows, userRows } from '~/mocks/fixtures';
import { ticketApi } from '~/features/tickets/api/ticket-api';
import { userApi } from '~/features/admin/users/api/user-api';
import { roleApi } from '~/features/admin/roles/api/role-api';
import { permissionApi } from '~/features/admin/permissions/api/permission-api';

/**
 * End-to-end proof of the msw data-client: the real feature API (supabase-js →
 * PostgREST request) hits the MSW handler and gets back what `applyListQuery` produces.
 *
 * Paired with the Supabase↔applier parity test, this closes the loop: applier == live
 * Supabase (parity test) and feature-api-over-MSW == applier (here), so the demo agrees
 * with production without a database in CI. This test asserts the WIRING — that the
 * request encodes and the response decodes correctly across the network boundary.
 */

const CASES: Record<string, Partial<ListParams>> = {
  default: {},
  'filter status=open': { filters: { status: 'open' } },
  'filter priority in [high,urgent]': { filters: { priority: ['high', 'urgent'] } },
  'sort priority desc': { sort: { field: 'priority', dir: 'desc' } },
  'search q=refund (FTS)': { q: 'refund' },
  'search q=payme (FTS miss -> trgm)': { q: 'payme' },
  'page 2': { page: 2 },
  'page beyond last': { page: 999 },
  'combined: search + filter + sort + page': {
    filters: { status: 'open' },
    sort: { field: 'priority', dir: 'desc' },
    page: 2,
    pageSize: 10,
  },
};

describe('ticket list over MSW', () => {
  it.each(Object.entries(CASES))('%s matches the in-memory applier', async (_name, partial) => {
    const params = listParamsSchema.parse(partial);

    const viaApi = await ticketApi.list(params);
    const viaApplier = applyListQuery(ticketRows, params, ticketListConfig);

    expect(viaApi.totalCount).toBe(viaApplier.totalCount);
    expect(viaApi.pageCount).toBe(viaApplier.pageCount);
    // The API maps rows to the camelCase domain model; compare on the stable id.
    expect(viaApi.rows.map((row) => row.id)).toEqual(viaApplier.rows.map((row) => row.id));
  });
});

describe('ticket detail over MSW', () => {
  it('returns the row addressed by id', async () => {
    const target = ticketRows[0];

    const ticket = await ticketApi.detail(target.id);

    expect(ticket.id).toBe(target.id);
    expect(ticket.subject).toBe(target.subject);
  });
});

describe('ticket tag filter over MSW', () => {
  // A tag carried by at least one ticket, and the ground-truth set of tickets on it.
  const tagId = ticketTagRows[0].tag_id;
  const expectedIds = new Set(
    ticketTagRows.filter((row) => row.tag_id === tagId).map((row) => row.ticket_id)
  );

  it('returns exactly the tickets carrying the tag (junction resolved to ids)', async () => {
    const result = await ticketApi.list({
      page: 1,
      pageSize: 100,
      filters: { tag_id: [tagId] },
    });

    expect(result.totalCount).toBe(expectedIds.size);
    for (const row of result.rows) expect(expectedIds.has(row.id)).toBe(true);
  });

  it('short-circuits to an empty page when no ticket carries the tag', async () => {
    const result = await ticketApi.list({
      page: 1,
      pageSize: 20,
      filters: { tag_id: ['00000000-0000-4000-8000-000000000000'] },
    });

    expect(result.totalCount).toBe(0);
    expect(result.rows).toHaveLength(0);
  });
});

describe('admin plain reads over MSW', () => {
  it('lists every profile', async () => {
    const { rows, totalCount } = await userApi.list({ page: 1, pageSize: 100, filters: {} });
    expect(totalCount).toBe(userRows.length);
    expect(rows).toHaveLength(userRows.length);
  });

  it('lists roles ordered by name', async () => {
    const roles = await roleApi.list();

    expect(roles).toHaveLength(roleRows.length);
    const names = roles.map((role) => role.name);
    expect(names).toEqual([...names].sort());
  });

  it('lists every permission', async () => {
    await expect(permissionApi.list()).resolves.toHaveLength(permissionRows.length);
  });
});
