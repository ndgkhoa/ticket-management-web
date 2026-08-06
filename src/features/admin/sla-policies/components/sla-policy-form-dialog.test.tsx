import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SlaPolicyFormDialog } from '~/features/admin/sla-policies/components/sla-policy-form-dialog';
import type { SlaPolicy } from '~/features/admin/sla-policies/schemas/sla-policy-schema';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  pending: { value: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/sla-policies/api/sla-policy-queries', () => ({
  useSlaPolicyCreate: () => ({ mutate: mocks.createMutate, isPending: mocks.pending.value }),
  useSlaPolicyUpdate: () => ({ mutate: mocks.updateMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const POLICY = {
  id: 'sla-1',
  name: 'Urgent — 15m / 4h',
  priority: 'high',
  first_response_mins: 15,
  resolution_mins: 240,
} as SlaPolicy;

const renderDialog = async (policy?: SlaPolicy | null) => {
  const onOpenChange = vi.fn();
  const rendered = await render(
    <SlaPolicyFormDialog open onOpenChange={onOpenChange} policy={policy} />
  );
  return { onOpenChange, ...rendered };
};

const save = () => screen.getByRole('button', { name: 'Save' });

const fill = async (
  user: { type: (el: HTMLElement, text: string) => Promise<void> },
  firstResponse: string,
  resolution: string
) => {
  await user.type(screen.getByLabelText('Name'), 'Urgent — 15m / 4h');
  await user.type(screen.getByLabelText('First response (min)'), firstResponse);
  await user.type(screen.getByLabelText('Resolution (min)'), resolution);
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.value = false;
});

describe('SlaPolicyFormDialog', () => {
  it('creates a policy with the minutes converted to numbers', async () => {
    const { user } = await renderDialog();

    await fill(user, '15', '240');
    await user.click(save());

    expect(mocks.createMutate).toHaveBeenCalledWith(
      { name: 'Urgent — 15m / 4h', priority: 'low', first_response_mins: 15, resolution_mins: 240 },
      expect.anything()
    );
  });

  it('prefills the stored minutes as text and updates by id', async () => {
    const { user } = await renderDialog(POLICY);

    expect(screen.getByLabelText('First response (min)')).toHaveValue(15);
    expect(screen.getByLabelText('Resolution (min)')).toHaveValue(240);

    await user.click(save());

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      {
        id: 'sla-1',
        input: {
          name: 'Urgent — 15m / 4h',
          priority: 'high',
          first_response_mins: 15,
          resolution_mins: 240,
        },
      },
      expect.anything()
    );
  });

  it('rejects zero minutes', async () => {
    const { user } = await renderDialog();

    await fill(user, '0', '240');
    await user.click(save());

    expect(await screen.findByText('Must be a positive whole number')).toBeInTheDocument();
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('rejects a negative target', async () => {
    const { user } = await renderDialog();

    await fill(user, '-5', '240');
    await user.click(save());

    expect(await screen.findByText('Must be a positive whole number')).toBeInTheDocument();
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('rejects a fractional target', async () => {
    const { user } = await renderDialog();

    await fill(user, '1.5', '240');
    await user.click(save());

    expect(await screen.findByText('Must be a positive whole number')).toBeInTheDocument();
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('requires both targets', async () => {
    const { user } = await renderDialog();

    await user.type(screen.getByLabelText('Name'), 'Urgent — 15m / 4h');
    await user.click(save());

    expect(await screen.findAllByText('This field is required')).toHaveLength(2);
    expect(mocks.createMutate).not.toHaveBeenCalled();
  });

  it('closes on success', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) => handlers.onSuccess());
    const { onOpenChange, user } = await renderDialog();

    await fill(user, '15', '240');
    await user.click(save());

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('reports a failure without closing', async () => {
    mocks.createMutate.mockImplementationOnce((_input, handlers) =>
      handlers.onError(new Error('overlapping policy'))
    );
    const { onOpenChange, user } = await renderDialog();

    await fill(user, '15', '240');
    await user.click(save());

    expect(mocks.toast.error).toHaveBeenCalledWith('overlapping policy');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('locks the form while a save is in flight', async () => {
    mocks.pending.value = true;
    await renderDialog();

    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(save()).toBeDisabled();
  });
});
