import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import '~/i18n';
import { AdminCrudPage } from '~/features/admin/shared/admin-crud-page';
import { render, screen, within } from '~/testing/render';

const mocks = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('sonner', () => ({ toast: mocks.toast }));

type Tag = { id: string; name: string };

const TAGS: Tag[] = [
  { id: 'a', name: 'billing' },
  { id: 'b', name: 'network' },
];

const columns: ColumnDef<Tag>[] = [{ accessorKey: 'name', header: 'Name' }];

type QueryState = Partial<UseQueryResult<Tag[], Error>>;
type RemoveState = Partial<UseMutationResult<void, Error, string>>;

const buildQuery = (state: QueryState = {}) =>
  ({ data: TAGS, isError: false, isPending: false, error: null, ...state }) as UseQueryResult<
    Tag[],
    Error
  >;

const buildRemove = (state: RemoveState = {}) =>
  ({ mutate: vi.fn(), isPending: false, ...state }) as unknown as UseMutationResult<
    void,
    Error,
    string
  >;

type FormProps = { open: boolean; onOpenChange: (open: boolean) => void; entity: Tag | null };

const renderPage = async (props: Partial<Parameters<typeof AdminCrudPage<Tag>>[0]> = {}) => {
  const renderForm = vi.fn((_props: FormProps) => <div data-testid="tag-form" />);
  const remove = props.remove ?? buildRemove();

  const result = await render(
    <AdminCrudPage<Tag>
      entityKey="Fields.Tag"
      query={props.query ?? buildQuery()}
      remove={remove}
      columns={columns}
      renderForm={props.renderForm ?? renderForm}
      rowActions={props.rowActions}
      canDelete={props.canDelete}
    />
  );

  return { renderForm, remove, ...result };
};

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

describe('AdminCrudPage rendering', () => {
  it('titles the page with the plural entity name and lists every row', async () => {
    await renderPage();

    expect(screen.getByText('List of tags')).toBeInTheDocument();
    expect(screen.getByText('billing')).toBeInTheDocument();
    expect(screen.getByText('network')).toBeInTheDocument();
  });

  it('numbers the rows in sorted order', async () => {
    await renderPage();

    expect(within(rowFor('billing')).getByText('1')).toBeInTheDocument();
    expect(within(rowFor('network')).getByText('2')).toBeInTheDocument();
  });

  it('replaces the table with the error page when the query fails', async () => {
    await renderPage({ query: buildQuery({ isError: true, error: new Error('denied') }) });

    expect(screen.getByText('denied')).toBeInTheDocument();
    expect(screen.queryByText('billing')).not.toBeInTheDocument();
  });

  it('shows the empty state when there is nothing to list', async () => {
    await renderPage({ query: buildQuery({ data: [] }) });

    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders the extra row actions supplied by the caller', async () => {
    await renderPage({ rowActions: (tag) => <span>action-{tag.id}</span> });

    expect(screen.getByText('action-a')).toBeInTheDocument();
    expect(screen.getByText('action-b')).toBeInTheDocument();
  });
});

describe('AdminCrudPage form', () => {
  it('keeps the form closed until it is asked for', async () => {
    const { renderForm } = await renderPage();

    expect(renderForm).not.toHaveBeenCalled();
    expect(screen.queryByTestId('tag-form')).not.toBeInTheDocument();
  });

  it('opens a blank form from the create button', async () => {
    const { renderForm, user } = await renderPage();

    await user.click(screen.getByRole('button', { name: 'Create tag' }));

    expect(screen.getByTestId('tag-form')).toBeInTheDocument();
    expect(renderForm).toHaveBeenLastCalledWith(expect.objectContaining({ entity: null }));
  });

  it('opens the form on the row being edited', async () => {
    const { renderForm, user } = await renderPage();

    await user.click(within(rowFor('network')).getByRole('button', { name: 'Edit' }));

    expect(renderForm).toHaveBeenLastCalledWith(expect.objectContaining({ entity: TAGS[1] }));
  });

  it('unmounts the form once it reports itself closed', async () => {
    const { renderForm, user } = await renderPage();
    await user.click(screen.getByRole('button', { name: 'Create tag' }));

    const { onOpenChange } = renderForm.mock.lastCall![0];
    await user.click(screen.getByRole('button', { name: 'Create tag' }));
    onOpenChange(false);

    await vi.waitFor(() => expect(screen.queryByTestId('tag-form')).not.toBeInTheDocument());
  });
});

describe('AdminCrudPage delete', () => {
  it('hides the delete button for rows the caller protects', async () => {
    await renderPage({ canDelete: (tag) => tag.id !== 'a' });

    expect(within(rowFor('billing')).queryByRole('button', { name: 'Delete tag' })).toBeNull();
    expect(
      within(rowFor('network')).getByRole('button', { name: 'Delete tag' })
    ).toBeInTheDocument();
  });

  it('asks for confirmation before deleting anything', async () => {
    const { remove, user } = await renderPage();

    await user.click(within(rowFor('billing')).getByRole('button', { name: 'Delete tag' }));

    expect(screen.getByText('Are you sure you want to delete this tag?')).toBeInTheDocument();
    expect(remove.mutate).not.toHaveBeenCalled();
  });

  it('deletes the confirmed row and closes the dialog', async () => {
    const remove = buildRemove({
      mutate: vi.fn((_id, options) => options?.onSuccess?.(undefined, _id, undefined)),
    });
    const { user } = await renderPage({ remove });

    await user.click(within(rowFor('billing')).getByRole('button', { name: 'Delete tag' }));
    await user.click(screen.getByRole('button', { name: 'Delete tag', hidden: false }));

    expect(remove.mutate).toHaveBeenCalledWith('a', expect.anything());
    await vi.waitFor(() =>
      expect(
        screen.queryByText('Are you sure you want to delete this tag?')
      ).not.toBeInTheDocument()
    );
  });

  it('surfaces a failed delete as a toast', async () => {
    const remove = buildRemove({
      mutate: vi.fn((_id, options) =>
        options?.onError?.(new Error('still in use'), _id, undefined)
      ),
    });
    const { user } = await renderPage({ remove });

    await user.click(within(rowFor('billing')).getByRole('button', { name: 'Delete tag' }));
    await user.click(screen.getByRole('button', { name: 'Delete tag', hidden: false }));

    expect(mocks.toast.error).toHaveBeenCalledWith('still in use');
  });

  it('closes the dialog without deleting when cancelled', async () => {
    const { remove, user } = await renderPage();

    await user.click(within(rowFor('billing')).getByRole('button', { name: 'Delete tag' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(remove.mutate).not.toHaveBeenCalled();
    await vi.waitFor(() =>
      expect(
        screen.queryByText('Are you sure you want to delete this tag?')
      ).not.toBeInTheDocument()
    );
  });
});
