import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseQueryResult } from '@tanstack/react-query';

import Permissions from '~/features/admin/permissions/pages/permissions';
import type { Permission } from '~/features/admin/permissions/schemas/permission-schema';
import { render, screen, within } from '~/testing/render';

const mocks = vi.hoisted(() => ({ usePermissionList: vi.fn() }));

vi.mock('~/features/admin/permissions/api/permission-queries', () => ({
  usePermissionList: mocks.usePermissionList,
}));

const permission = (code: string, description: string | null = null): Permission =>
  ({ id: code, code, description }) as Permission;

const queryResult = (state: Partial<UseQueryResult<Permission[], Error>>) =>
  ({ data: [], isPending: false, isError: false, error: null, ...state }) as UseQueryResult<
    Permission[],
    Error
  >;

const groupHeadings = () =>
  screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

const sectionFor = (heading: string) =>
  screen.getByRole('heading', { name: heading }).closest('section')!;

beforeEach(() => vi.clearAllMocks());

describe('Permissions grouping', () => {
  it('groups codes by their resource prefix and labels each group', async () => {
    mocks.usePermissionList.mockReturnValue(
      queryResult({ data: [permission('ticket.read'), permission('role.update')] })
    );

    await render(<Permissions />);

    expect(groupHeadings()).toEqual(['Tickets', 'Roles']);
    expect(within(sectionFor('Tickets')).getByText('ticket.read')).toBeInTheDocument();
  });

  it('orders the groups by the fixed resource order, not alphabetically', async () => {
    mocks.usePermissionList.mockReturnValue(
      queryResult({
        data: [permission('role.read'), permission('user.read'), permission('ticket.read')],
      })
    );

    await render(<Permissions />);

    expect(groupHeadings()).toEqual(['Tickets', 'Users', 'Roles']);
  });

  it('drops an unknown resource into Other at the end', async () => {
    mocks.usePermissionList.mockReturnValue(
      queryResult({ data: [permission('billing.read'), permission('ticket.read')] })
    );

    await render(<Permissions />);

    expect(groupHeadings()).toEqual(['Tickets', 'Other']);
  });

  it('treats a code with no dot as its own resource', async () => {
    mocks.usePermissionList.mockReturnValue(queryResult({ data: [permission('audit')] }));

    await render(<Permissions />);

    expect(groupHeadings()).toEqual(['Other']);
    expect(screen.getByText('audit')).toBeInTheDocument();
  });

  it('sorts codes inside a group and counts them in the badge', async () => {
    mocks.usePermissionList.mockReturnValue(
      queryResult({
        data: [permission('ticket.update'), permission('ticket.create'), permission('ticket.read')],
      })
    );

    await render(<Permissions />);

    const codes = within(sectionFor('Tickets'))
      .getAllByRole('listitem')
      .map((item) => item.querySelector('code')?.textContent);
    expect(codes).toEqual(['ticket.create', 'ticket.read', 'ticket.update']);
    expect(within(sectionFor('Tickets')).getByText('3')).toBeInTheDocument();
  });

  it('shows a dash when a permission carries no description', async () => {
    mocks.usePermissionList.mockReturnValue(queryResult({ data: [permission('ticket.read')] }));

    await render(<Permissions />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('Permissions search', () => {
  beforeEach(() =>
    mocks.usePermissionList.mockReturnValue(
      queryResult({
        data: [
          permission('ticket.read', 'View tickets'),
          permission('role.update', 'Change a role'),
        ],
      })
    )
  );

  it('filters by code', async () => {
    const { user } = await render(<Permissions />);

    await user.type(screen.getByLabelText('Search'), 'role');

    expect(groupHeadings()).toEqual(['Roles']);
  });

  it('filters by description too', async () => {
    const { user } = await render(<Permissions />);

    await user.type(screen.getByLabelText('Search'), 'view');

    expect(groupHeadings()).toEqual(['Tickets']);
  });

  it('ignores case and surrounding whitespace', async () => {
    const { user } = await render(<Permissions />);

    await user.type(screen.getByLabelText('Search'), '  TICKET  ');

    expect(groupHeadings()).toEqual(['Tickets']);
  });

  it('reports when nothing matches', async () => {
    const { user } = await render(<Permissions />);

    await user.type(screen.getByLabelText('Search'), 'zzz');

    expect(screen.getByText('No results match your filters')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });
});

describe('Permissions loading and failure', () => {
  it('shows placeholders while the list loads', async () => {
    mocks.usePermissionList.mockReturnValue(queryResult({ isPending: true, data: undefined }));

    await render(<Permissions />);

    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(screen.queryByText('No results match your filters')).toBeNull();
  });

  it('replaces the list with the error page when the query fails', async () => {
    mocks.usePermissionList.mockReturnValue(
      queryResult({ isError: true, error: new Error('forbidden') })
    );

    await render(<Permissions />);

    expect(screen.getByText('forbidden')).toBeInTheDocument();
    expect(screen.queryByLabelText('Search')).toBeNull();
  });
});
