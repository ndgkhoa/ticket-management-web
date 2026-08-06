import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ticketQueries,
  useCreateTicket,
  useTicketList,
  useUpdateTicket,
} from '~/features/tickets/api/ticket-queries';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import { renderHookWithInvalidateSpy, renderHookWithProviders, waitFor } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  detail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  bulkUpdate: vi.fn(),
  embed: vi.fn(),
}));

vi.mock('~/features/tickets/api/ticket-api', () => ({
  ticketApi: {
    list: mocks.list,
    detail: mocks.detail,
    create: mocks.create,
    update: mocks.update,
    bulkUpdate: mocks.bulkUpdate,
  },
}));

vi.mock('~/features/tickets/api/embed-ticket-api', () => ({
  embedTicketInBackground: mocks.embed,
}));

const PARAMS = {
  page: 1,
  pageSize: 20,
  sort: { field: 'created_at', dir: 'desc' },
  filters: {},
} as never;
const TICKET = { id: 't1', subject: 'Printer down' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ rows: [TICKET], count: 1 });
  mocks.detail.mockResolvedValue(TICKET);
  mocks.create.mockResolvedValue(TICKET);
  mocks.update.mockResolvedValue(TICKET);
});

describe('ticketQueries', () => {
  it('keys list and detail under their own namespaces', () => {
    expect(ticketQueries.list(PARAMS).queryKey).toEqual(ticketKeys.list(PARAMS));
    expect(ticketQueries.detail('t1').queryKey).toEqual(ticketKeys.detail('t1'));
  });

  it('loads a page of tickets through the api', async () => {
    const { result } = renderHookWithProviders(() => useTicketList(PARAMS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.list).toHaveBeenCalledWith(PARAMS);
    expect(result.current.data).toEqual({ rows: [TICKET], count: 1 });
  });
});

describe('useCreateTicket', () => {
  it('queues the embedding for the new ticket and refreshes the lists', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useCreateTicket);

    result.current.mutate({ subject: 'Printer down' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.create).toHaveBeenCalledWith({ subject: 'Printer down' });
    expect(mocks.embed).toHaveBeenCalledWith('t1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.lists() });
  });

  it('does not queue an embedding when creation fails', async () => {
    mocks.create.mockRejectedValue(new Error('rejected'));
    const { result, invalidate } = renderHookWithInvalidateSpy(useCreateTicket);

    result.current.mutate({ subject: 'Printer down' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mocks.embed).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useUpdateTicket', () => {
  it('refreshes both the edited ticket and the lists it appears in', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useUpdateTicket);

    result.current.mutate({ id: 't1', patch: { status: 'closed' } as never });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.update).toHaveBeenCalledWith('t1', { status: 'closed' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.detail('t1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.lists() });
  });
});
