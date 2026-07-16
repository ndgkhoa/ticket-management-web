import { describe, expect, it } from 'vitest';

import {
  ticketSearchSchema,
  toTicketListParams,
  type TicketSearch,
} from '~/features/tickets/schemas/ticket-search-schema';

describe('ticketSearchSchema', () => {
  it('applies defaults for an empty URL', () => {
    expect(ticketSearchSchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      sort: 'created_at',
      dir: 'desc',
    });
  });

  it('coerces string page/pageSize from the URL', () => {
    const parsed = ticketSearchSchema.parse({ page: '3', pageSize: '50' });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(50);
  });

  it('falls back to defaults on garbage rather than crashing the route', () => {
    expect(ticketSearchSchema.parse({ page: 'abc' }).page).toBe(1);
    expect(ticketSearchSchema.parse({ pageSize: '999' }).pageSize).toBe(20);
    expect(ticketSearchSchema.parse({ dir: 'sideways' }).dir).toBe('desc');
    expect(ticketSearchSchema.parse({ sort: 'not_a_column' }).sort).toBe('created_at');
  });

  it('validates filter values against their enums, dropping invalid ones', () => {
    expect(ticketSearchSchema.parse({ status: ['open', 'pending'] }).status).toEqual([
      'open',
      'pending',
    ]);
    // An invalid enum value falls back to undefined — it never reaches the data layer
    // (where it would raise a Postgres 22P02 on the enum column).
    expect(ticketSearchSchema.parse({ status: ['garbage'] }).status).toBeUndefined();
    expect(ticketSearchSchema.parse({ assigneeId: 'not-a-uuid' }).assigneeId).toBeUndefined();
  });

  it('blanks an empty query so the search clause is skipped', () => {
    expect(ticketSearchSchema.parse({ q: '   ' }).q).toBeUndefined();
    expect(ticketSearchSchema.parse({ q: '  refund ' }).q).toBe('refund');
  });
});

describe('toTicketListParams', () => {
  const base: TicketSearch = {
    page: 2,
    pageSize: 50,
    sort: 'priority',
    dir: 'asc',
  };

  it('maps flat URL params to the nested list-query shape', () => {
    const params = toTicketListParams({
      ...base,
      q: 'refund',
      status: ['open'],
      priority: ['high', 'urgent'],
      assigneeId: '00000001-0000-4000-8000-000000000003',
    });

    expect(params).toEqual({
      page: 2,
      pageSize: 50,
      q: 'refund',
      sort: { field: 'priority', dir: 'asc' },
      filters: {
        status: ['open'],
        priority: ['high', 'urgent'],
        assignee_id: '00000001-0000-4000-8000-000000000003',
      },
    });
  });

  it('omits empty filters entirely', () => {
    expect(toTicketListParams(base).filters).toEqual({});
  });
});
