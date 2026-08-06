import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryFormDialog } from '~/features/admin/categories/components/category-form-dialog';
import type { Category } from '~/features/admin/categories/schemas/category-schema';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  pending: { value: false },
  teams: { value: [{ id: 'team-1', name: 'Technical' }] as { id: string; name: string }[] },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/categories/api/category-queries', () => ({
  useCategoryCreate: () => ({ mutate: mocks.createMutate, isPending: mocks.pending.value }),
  useCategoryUpdate: () => ({ mutate: mocks.updateMutate, isPending: false }),
}));

vi.mock('~/features/admin/teams/api/team-queries', () => ({
  useTeamList: () => ({ data: mocks.teams.value }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const CATEGORY = {
  id: 'cat-1',
  name: 'Bug report',
  description: 'Something is broken',
  defaultTeamId: 'team-1',
} as Category;

const renderDialog = async (category?: Category | null) => {
  const onOpenChange = vi.fn();
  const rendered = await render(
    <CategoryFormDialog open onOpenChange={onOpenChange} category={category} />
  );
  return { onOpenChange, ...rendered };
};

const save = () => screen.getByRole('button', { name: 'Save' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.value = false;
  mocks.teams.value = [{ id: 'team-1', name: 'Technical' }];
});

describe('CategoryFormDialog', () => {
  it('creates a category with trimmed values and no team by default', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), '  Bug report  ');
    await user.type(screen.getByLabelText('Description'), '  Something is broken  ');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Bug report', description: 'Something is broken', default_team_id: null },
      expect.anything()
    );
  });

  it('sends a null description rather than an empty string', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), 'Bug report');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Bug report', description: null, default_team_id: null },
      expect.anything()
    );
  });

  it('keeps the routing team when updating an existing category', async () => {
    const { user } = await renderDialog(CATEGORY);

    expect(screen.getByLabelText('Name')).toHaveValue('Bug report');
    await user.click(save());

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      {
        id: 'cat-1',
        input: {
          name: 'Bug report',
          description: 'Something is broken',
          default_team_id: 'team-1',
        },
      },
      expect.anything()
    );
  });

  it('refuses to submit without a name', async () => {
    const { user } = await renderDialog();

    await user.click(save());

    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('offers a default team picker even when no team exists yet', async () => {
    mocks.teams.value = [];
    await renderDialog();

    expect(screen.getByText('Default team')).toBeInTheDocument();
  });

  it('closes on success', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) => handlers.onSuccess());
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), 'Bug report');
    await user.click(save());

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports a failure without closing', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) =>
      handlers.onError(new Error('name taken'))
    );
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), 'Bug report');
    await user.click(save());

    expect(mocks.toast.error).toHaveBeenCalledWith('name taken');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('locks the form while a save is in flight', async () => {
    mocks.pending.value = true;
    await renderDialog();

    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
