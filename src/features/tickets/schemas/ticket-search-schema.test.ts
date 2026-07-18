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
      smart: false,
    });
  });

  it('reads the smart toggle from both boolean and string forms', () => {
    expect(ticketSearchSchema.parse({}).smart).toBe(false);
    expect(ticketSearchSchema.parse({ smart: true }).smart).toBe(true);
    expect(ticketSearchSchema.parse({ smart: 'true' }).smart).toBe(true);
    // The bug a plain `z.coerce.boolean()` would introduce: the string 'false' → true.
    expect(ticketSearchSchema.parse({ smart: 'false' }).smart).toBe(false);
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

  it('validates filter values against their enums', () => {
    expect(ticketSearchSchema.parse({ status: ['open', 'pending'] }).status).toEqual([
      'open',
      'pending',
    ]);
    // Any invalid member drops the WHOLE filter to undefined (all-or-nothing) — it
    // never reaches the data layer, where it would raise a Postgres 22P02.
    expect(ticketSearchSchema.parse({ status: ['garbage'] }).status).toBeUndefined();
    expect(ticketSearchSchema.parse({ status: ['open', 'garbage'] }).status).toBeUndefined();
  });

  it('drops a relationship-id filter whole when any member is not a uuid', () => {
    const good = '00000001-0000-4000-8000-000000000003';
    expect(ticketSearchSchema.parse({ assigneeIds: [good] }).assigneeIds).toEqual([good]);
    expect(ticketSearchSchema.parse({ assigneeIds: ['not-a-uuid'] }).assigneeIds).toBeUndefined();
    expect(ticketSearchSchema.parse({ teamIds: [good, 'nope'] }).teamIds).toBeUndefined();
    expect(ticketSearchSchema.parse({ tagIds: ['nope'] }).tagIds).toBeUndefined();
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
    smart: false,
  };

  it('maps flat URL params to the nested list-query shape', () => {
    const assignee = '00000001-0000-4000-8000-000000000003';
    const team = '00000001-0000-4000-8000-000000000004';
    const tag = '00000001-0000-4000-8000-000000000005';
    const params = toTicketListParams({
      ...base,
      q: 'refund',
      status: ['open'],
      priority: ['high', 'urgent'],
      assigneeIds: [assignee],
      teamIds: [team],
      tagIds: [tag],
    });

    expect(params).toEqual({
      page: 2,
      pageSize: 50,
      q: 'refund',
      sort: { field: 'priority', dir: 'asc' },
      filters: {
        status: ['open'],
        priority: ['high', 'urgent'],
        assignee_id: [assignee],
        team_id: [team],
        tag_id: [tag],
      },
    });
  });

  it('omits empty filters entirely', () => {
    expect(toTicketListParams(base).filters).toEqual({});
  });
});
