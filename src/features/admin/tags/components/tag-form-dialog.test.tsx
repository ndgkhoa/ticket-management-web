import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TagFormDialog } from '~/features/admin/tags/components/tag-form-dialog';
import type { Tag } from '~/features/admin/tags/schemas/tag-schema';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  pending: { value: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/tags/api/tag-queries', () => ({
  useTagCreate: () => ({ mutate: mocks.createMutate, isPending: mocks.pending.value }),
  useTagUpdate: () => ({ mutate: mocks.updateMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const TAG = { id: 'tag-1', name: 'refund', color: '#ff0000' } as Tag;

const renderDialog = async (tag?: Tag | null) => {
  const onOpenChange = vi.fn();
  const rendered = await render(<TagFormDialog open onOpenChange={onOpenChange} tag={tag} />);
  return { onOpenChange, ...rendered };
};

const save = () => screen.getByRole('button', { name: 'Save' });
const colorValue = () => (screen.getByLabelText('Color') as HTMLInputElement).value;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.value = false;
});

describe('TagFormDialog', () => {
  it('creates a tag with a trimmed name and the chosen colour', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), '  escalated  ');
    const color = colorValue();
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'escalated', color },
      expect.anything()
    );
  });

  it('prefills and updates an existing tag by id', async () => {
    const { user } = await renderDialog(TAG);

    expect(screen.getByLabelText('Name')).toHaveValue('refund');
    expect(colorValue()).toBe('#ff0000');

    await user.click(save());

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      { id: 'tag-1', input: { name: 'refund', color: '#ff0000' } },
      expect.anything()
    );
  });

  it('refuses to submit without a name', async () => {
    const { user } = await renderDialog();

    await user.click(save());

    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('closes on success and reports failure without closing', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) => handlers.onSuccess());
    const first = await renderDialog();
    await first.user.type(screen.getByLabelText('Name'), 'escalated');
    await first.user.click(save());
    expect(first.onOpenChange).toHaveBeenCalledWith(false);

    first.unmount();
    mocks.createMutate.mockImplementationOnce((_input, handlers) =>
      handlers.onError(new Error('name taken'))
    );
    const second = await renderDialog();
    await second.user.type(screen.getByLabelText('Name'), 'escalated');
    await second.user.click(save());

    expect(mocks.toast.error).toHaveBeenCalledWith('name taken');
    expect(second.onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('locks the form while a save is in flight', async () => {
    mocks.pending.value = true;
    await renderDialog();

    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
