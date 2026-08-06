import { beforeEach, describe, expect, it, vi } from 'vitest';

import CannedResponses from '~/features/admin/canned-responses/pages/canned-responses';
import type { CannedResponse } from '~/features/admin/canned-responses/schemas/canned-response-schema';
import { render, screen, waitFor, within } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  setSearch: vi.fn(),
  search: {
    value: { page: 1, pageSize: 20, sort: 'created_at', dir: 'desc', q: undefined } as {
      page: number;
      pageSize: number;
      sort: string;
      dir: string;
      q?: string;
    },
  },
  list: { value: {} as Record<string, unknown> },
  removeMutate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/canned-responses/hooks/use-canned-response-search-params', () => ({
  useCannedResponseSearchParams: () => ({
    search: mocks.search.value,
    setSearch: mocks.setSearch,
  }),
}));

vi.mock('~/features/admin/canned-responses/api/canned-response-queries', () => ({
  useCannedResponseList: () => mocks.list.value,
  useCannedResponseRemove: () => ({ mutate: mocks.removeMutate, isPending: false }),
}));

vi.mock('~/features/admin/canned-responses/components/canned-response-form-dialog', () => ({
  CannedResponseFormDialog: ({ cannedResponse }: { cannedResponse: CannedResponse | null }) => (
    <div data-testid="form-dialog">{cannedResponse?.title ?? 'new'}</div>
  ),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const ROWS = [
  {
    id: 'c1',
    title: 'Acknowledge and set expectations',
    body: 'Thanks for getting in touch',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    title: 'Closing after silence',
    body: 'Closing this for now',
    createdAt: '2026-01-02T00:00:00Z',
  },
] as CannedResponse[];

const listResult = (overrides: Record<string, unknown> = {}) => ({
  data: { rows: ROWS, totalCount: ROWS.length },
  isPending: false,
  isError: false,
  isPlaceholderData: false,
  error: null,
  ...overrides,
});

const rowFor = (title: string) => screen.getByRole('row', { name: new RegExp(title) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.value = { page: 1, pageSize: 20, sort: 'created_at', dir: 'desc', q: undefined };
  mocks.list.value = listResult();
});

describe('CannedResponses listing', () => {
  it('lists the page of responses', async () => {
    await render(<CannedResponses />);

    expect(screen.getByText('Acknowledge and set expectations')).toBeInTheDocument();
    expect(screen.getByText('Closing after silence')).toBeInTheDocument();
  });

  it('numbers rows continuing from the current page offset', async () => {
    mocks.search.value = { ...mocks.search.value, page: 3, pageSize: 20 };
    await render(<CannedResponses />);

    expect(within(rowFor('Acknowledge and set expectations')).getByText('41')).toBeInTheDocument();
    expect(within(rowFor('Closing after silence')).getByText('42')).toBeInTheDocument();
  });

  it('replaces the table with the error page when the query fails', async () => {
    mocks.list.value = listResult({
      isError: true,
      error: new Error('forbidden'),
      data: undefined,
    });
    await render(<CannedResponses />);

    expect(screen.getByText('forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Acknowledge and set expectations')).toBeNull();
  });
});

describe('CannedResponses form', () => {
  it('keeps the form closed until it is asked for', async () => {
    await render(<CannedResponses />);

    expect(screen.queryByTestId('form-dialog')).toBeNull();
  });

  it('opens a blank form from the create button', async () => {
    const { user } = await render(<CannedResponses />);

    await user.click(screen.getByRole('button', { name: 'Create canned response' }));

    expect(screen.getByTestId('form-dialog')).toHaveTextContent('new');
  });

  it('opens the form on the row being edited', async () => {
    const { user } = await render(<CannedResponses />);

    await user.click(within(rowFor('Closing after silence')).getByRole('button', { name: 'Edit' }));

    expect(screen.getByTestId('form-dialog')).toHaveTextContent('Closing after silence');
  });
});

describe('CannedResponses delete', () => {
  it('asks for confirmation before deleting', async () => {
    const { user } = await render(<CannedResponses />);

    await user.click(
      within(rowFor('Acknowledge and set expectations')).getByRole('button', {
        name: 'Delete canned response',
      })
    );

    expect(
      screen.getByText('Are you sure you want to delete this canned response?')
    ).toBeInTheDocument();
    expect(mocks.removeMutate).not.toHaveBeenCalled();
  });

  it('deletes the confirmed row', async () => {
    const { user } = await render(<CannedResponses />);

    await user.click(
      within(rowFor('Acknowledge and set expectations')).getByRole('button', {
        name: 'Delete canned response',
      })
    );
    await user.click(screen.getByRole('button', { name: 'Delete canned response', hidden: false }));

    expect(mocks.removeMutate).toHaveBeenCalledWith('c1', expect.anything());
  });

  it('surfaces a failed delete as a toast', async () => {
    mocks.removeMutate.mockImplementationOnce((_id, options) =>
      options?.onError?.(new Error('in use'))
    );
    const { user } = await render(<CannedResponses />);

    await user.click(
      within(rowFor('Acknowledge and set expectations')).getByRole('button', {
        name: 'Delete canned response',
      })
    );
    await user.click(screen.getByRole('button', { name: 'Delete canned response', hidden: false }));

    expect(mocks.toast.error).toHaveBeenCalledWith('in use');
  });
});

describe('CannedResponses search', () => {
  it('debounces a typed term and replaces rather than stacks history entries', async () => {
    const { user } = await render(<CannedResponses />);

    await user.type(screen.getByPlaceholderText('Search'), 'gre');
    expect(mocks.setSearch).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(mocks.setSearch).toHaveBeenCalledWith({ q: 'gre' }, { replace: true })
    );
  });

  it('clears the term when the filters are reset', async () => {
    mocks.search.value = { ...mocks.search.value, q: 'gre' };
    mocks.list.value = listResult({ data: { rows: [], totalCount: 0 } });
    const { user } = await render(<CannedResponses />);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(mocks.setSearch).toHaveBeenCalledWith({ q: undefined });
  });

  it('offers the no-results state only while a filter is active', async () => {
    mocks.search.value = { ...mocks.search.value, q: 'zzz' };
    mocks.list.value = listResult({ data: { rows: [], totalCount: 0 } });
    await render(<CannedResponses />);

    expect(screen.getByText('No results match your filters')).toBeInTheDocument();
  });

  it('shows the empty state when nothing is filtered', async () => {
    mocks.list.value = listResult({ data: { rows: [], totalCount: 0 } });
    await render(<CannedResponses />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
