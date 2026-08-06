import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CannedResponseFormDialog } from '~/features/admin/canned-responses/components/canned-response-form-dialog';
import type { CannedResponse } from '~/features/admin/canned-responses/schemas/canned-response-schema';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  pending: { value: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/canned-responses/api/canned-response-queries', () => ({
  useCannedResponseCreate: () => ({
    mutate: mocks.createMutate,
    isPending: mocks.pending.value,
  }),
  useCannedResponseUpdate: () => ({ mutate: mocks.updateMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const RESPONSE = {
  id: 'c1',
  title: 'Acknowledge and set expectations',
  body: 'Thanks for getting in touch',
} as CannedResponse;

const renderDialog = async (cannedResponse?: CannedResponse | null) => {
  const onOpenChange = vi.fn();
  const rendered = await render(
    <CannedResponseFormDialog open onOpenChange={onOpenChange} cannedResponse={cannedResponse} />
  );
  return { onOpenChange, ...rendered };
};

const save = () => screen.getByRole('button', { name: 'Save' });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.value = false;
});

describe('CannedResponseFormDialog', () => {
  it('creates a response with trimmed title and body', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Title'), '  Acknowledge and set expectations  ');
    await user.type(screen.getByLabelText('Body'), '  Thanks for getting in touch  ');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { title: 'Acknowledge and set expectations', body: 'Thanks for getting in touch' },
      expect.anything()
    );
  });

  it('prefills and updates an existing response by id', async () => {
    const { user } = await renderDialog(RESPONSE);

    expect(screen.getByLabelText('Title')).toHaveValue('Acknowledge and set expectations');
    expect(screen.getByLabelText('Body')).toHaveValue('Thanks for getting in touch');

    await user.click(save());

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      {
        id: 'c1',
        input: { title: 'Acknowledge and set expectations', body: 'Thanks for getting in touch' },
      },
      expect.anything()
    );
  });

  it('requires both a title and a body', async () => {
    const { user } = await renderDialog();

    await user.click(save());

    expect(await screen.findAllByText('This field is required')).toHaveLength(2);
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('closes on success', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) => handlers.onSuccess());
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Acknowledge and set expectations');
    await user.type(screen.getByLabelText('Body'), 'Thanks for getting in touch');
    await user.click(save());

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports a failure without closing', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) =>
      handlers.onError(new Error('title taken'))
    );
    const { onOpenChange, user } = await renderDialog();

    await user.type(screen.getByLabelText('Title'), 'Acknowledge and set expectations');
    await user.type(screen.getByLabelText('Body'), 'Thanks for getting in touch');
    await user.click(save());

    expect(mocks.toast.error).toHaveBeenCalledWith('title taken');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('locks the form while a save is in flight', async () => {
    mocks.pending.value = true;
    await renderDialog();

    expect(screen.getByLabelText('Title')).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
