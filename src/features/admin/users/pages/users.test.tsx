import { beforeEach, describe, expect, it, vi } from 'vitest';

import Users from '~/features/admin/users/pages/users';
import type { User } from '~/features/admin/users/schemas/user-schema';
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
}));

vi.mock('~/features/admin/users/hooks/use-user-search-params', () => ({
  useUserSearchParams: () => ({ search: mocks.search.value, setSearch: mocks.setSearch }),
}));

vi.mock('~/features/admin/users/api/user-queries', () => ({
  useUserList: () => mocks.list.value,
}));

vi.mock('~/features/admin/users/components/user-roles-dialog', () => ({
  UserRolesDialog: ({ user }: { user: User }) => <div data-testid="roles-dialog">{user.email}</div>,
}));

const ROWS = [
  {
    id: 'u1',
    fullName: 'Khoa',
    email: 'khoa@example.com',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u2',
    fullName: null,
    email: 'mai@example.com',
    avatarUrl: null,
    createdAt: '2026-01-02T00:00:00Z',
  },
] as User[];

const listResult = (overrides: Record<string, unknown> = {}) => ({
  data: { rows: ROWS, totalCount: ROWS.length },
  isPending: false,
  isError: false,
  isPlaceholderData: false,
  error: null,
  ...overrides,
});

const rowFor = (text: string) => screen.getByRole('row', { name: new RegExp(text) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.value = { page: 1, pageSize: 20, sort: 'created_at', dir: 'desc', q: undefined };
  mocks.list.value = listResult();
});

describe('Users listing', () => {
  it('lists the page of users', async () => {
    await render(<Users />);

    expect(screen.getByText('khoa@example.com')).toBeInTheDocument();
    expect(screen.getByText('mai@example.com')).toBeInTheDocument();
  });

  it('falls back to a dash when a user has no name', async () => {
    await render(<Users />);

    expect(within(rowFor('mai@example.com')).getByText('—')).toBeInTheDocument();
  });

  it('numbers rows continuing from the current page offset', async () => {
    mocks.search.value = { ...mocks.search.value, page: 2, pageSize: 20 };
    await render(<Users />);

    expect(within(rowFor('khoa@example.com')).getByText('21')).toBeInTheDocument();
  });

  it('replaces the table with the error page when the query fails', async () => {
    mocks.list.value = listResult({
      isError: true,
      error: new Error('forbidden'),
      data: undefined,
    });
    await render(<Users />);

    expect(screen.getByText('forbidden')).toBeInTheDocument();
    expect(screen.queryByText('khoa@example.com')).toBeNull();
  });
});

describe('Users roles dialog', () => {
  it('stays closed until a user is chosen', async () => {
    await render(<Users />);

    expect(screen.queryByTestId('roles-dialog')).toBeNull();
  });

  it('opens for the chosen user', async () => {
    const { user } = await render(<Users />);

    await user.click(
      within(rowFor('mai@example.com')).getByRole('button', { name: 'roles of user' })
    );

    expect(screen.getByTestId('roles-dialog')).toHaveTextContent('mai@example.com');
  });
});

describe('Users search', () => {
  it('debounces a typed term and replaces rather than stacks history entries', async () => {
    const { user } = await render(<Users />);

    await user.type(screen.getByPlaceholderText('Search'), 'kho');
    expect(mocks.setSearch).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(mocks.setSearch).toHaveBeenCalledWith({ q: 'kho' }, { replace: true })
    );
  });

  it('clears the term when the filters are reset', async () => {
    mocks.search.value = { ...mocks.search.value, q: 'zzz' };
    mocks.list.value = listResult({ data: { rows: [], totalCount: 0 } });
    const { user } = await render(<Users />);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(mocks.setSearch).toHaveBeenCalledWith({ q: undefined });
  });

  it('shows the empty state when nothing is filtered', async () => {
    mocks.list.value = listResult({ data: { rows: [], totalCount: 0 } });
    await render(<Users />);

    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
