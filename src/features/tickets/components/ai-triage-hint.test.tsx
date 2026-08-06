import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiTriageHint } from '~/features/tickets/components/ai-triage-hint';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  aiEnabled: { value: true },
  triage: { value: {} as Record<string, unknown> },
  mutate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/tickets/api/ai-client', () => ({
  get isAiEnabled() {
    return mocks.aiEnabled.value;
  },
}));

vi.mock('~/features/tickets/api/triage-ticket-queries', () => ({
  useTriageTicket: () => mocks.triage.value,
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const CATEGORIES = [
  { id: 'cat-1', name: 'Hardware' },
  { id: 'cat-2', name: 'Billing' },
];

type Overrides = Partial<Parameters<typeof AiTriageHint>[0]>;

const renderHint = async (overrides: Overrides = {}) => {
  const onApply = vi.fn();
  const rendered = await render(
    <AiTriageHint
      subject="Printer down"
      description="It will not print"
      categories={CATEGORIES}
      onApply={onApply}
      {...overrides}
    />
  );
  return { onApply, ...rendered };
};

const triageState = (overrides: Record<string, unknown> = {}) => ({
  mutate: mocks.mutate,
  isPending: false,
  data: undefined,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.aiEnabled.value = true;
  mocks.triage.value = triageState();
});

describe('AiTriageHint availability', () => {
  it('renders nothing when AI is switched off', async () => {
    mocks.aiEnabled.value = false;
    await renderHint();

    expect(screen.queryByText('AI triage')).toBeNull();
  });

  it('offers a suggestion once a subject is typed', async () => {
    await renderHint();

    expect(screen.getByRole('button', { name: 'Suggest' })).toBeEnabled();
  });

  it('stays disabled while the subject is blank', async () => {
    await renderHint({ subject: '   ' });

    expect(screen.getByRole('button', { name: 'Suggest' })).toBeDisabled();
  });

  it('shows progress while the model is thinking', async () => {
    mocks.triage.value = triageState({ isPending: true });
    await renderHint();

    expect(screen.getByRole('button', { name: 'Thinking…' })).toBeDisabled();
  });
});

describe('AiTriageHint suggestion', () => {
  it('sends the draft and the category names to the model', async () => {
    const { user } = await renderHint();

    await user.click(screen.getByRole('button', { name: 'Suggest' }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        subject: 'Printer down',
        description: 'It will not print',
        categories: ['Hardware', 'Billing'],
      },
      expect.anything()
    );
  });

  it('surfaces a failed suggestion as a toast', async () => {
    mocks.mutate.mockImplementationOnce((_input, handlers) =>
      handlers?.onError?.(new Error('rate limited'))
    );
    const { user } = await renderHint();

    await user.click(screen.getByRole('button', { name: 'Suggest' }));

    expect(mocks.toast.error).toHaveBeenCalledWith('rate limited');
  });

  it('matches the suggested category name case-insensitively', async () => {
    mocks.triage.value = triageState({
      data: { priority: 'high', category: 'hardware', reason: 'Mentions a printer' },
    });
    const { onApply, user } = await renderHint();

    expect(screen.getByText('Category: Hardware')).toBeInTheDocument();
    expect(screen.getByText('Priority: high')).toBeInTheDocument();
    expect(screen.getByText('Mentions a printer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ priority: 'high', categoryId: 'cat-1' });
  });

  it('applies the priority alone when the category is unknown', async () => {
    mocks.triage.value = triageState({
      data: { priority: 'low', category: 'Networking', reason: 'Unclear' },
    });
    const { onApply, user } = await renderHint();

    expect(screen.queryByText(/^Category:/)).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ priority: 'low', categoryId: null });
  });

  it('applies the priority alone when the model names no category', async () => {
    mocks.triage.value = triageState({
      data: { priority: 'urgent', category: null, reason: 'Outage' },
    });
    const { onApply, user } = await renderHint();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith({ priority: 'urgent', categoryId: null });
  });
});
