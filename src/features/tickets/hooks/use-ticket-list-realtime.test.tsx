import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { Mock } from 'vitest';

import '~/i18n';
import { registerRealtimeTransport, type RealtimeChange } from '~/lib/realtime';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import { useTicketListRealtime } from '~/features/tickets/hooks/use-ticket-list-realtime';

const mocks = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), { dismiss: vi.fn() });
  return { toast };
});

vi.mock('sonner', () => ({ toast: mocks.toast }));

const THROTTLE_MS = 1500;

let queryClient: QueryClient;
let invalidate: ReturnType<typeof vi.spyOn>;
let emit: (change: RealtimeChange) => void;
let unsubscribe: Mock<() => void>;
let now: number;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const setup = (props: { canAutoRefresh: boolean; viewKey: string }) =>
  renderHook((args: { canAutoRefresh: boolean; viewKey: string }) => useTicketListRealtime(args), {
    wrapper,
    initialProps: props,
  });

const change: RealtimeChange = { eventType: 'INSERT', new: { id: 't9' }, old: null };

const toastOptions = () =>
  mocks.toast.mock.calls.at(-1)?.[1] as {
    action: { onClick: () => void };
    onAutoClose: () => void;
  };

beforeEach(() => {
  vi.clearAllMocks();
  now = 1_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => now);

  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

  unsubscribe = vi.fn<() => void>();
  registerRealtimeTransport({
    subscribeTable: (_table, onChange) => {
      emit = onChange;
      return unsubscribe;
    },
    joinPresence: () => () => {},
  });
});

afterEach(() => queryClient.clear());

describe('useTicketListRealtime with auto refresh on', () => {
  it('invalidates the ticket lists as soon as a change lands', () => {
    setup({ canAutoRefresh: true, viewKey: 'all' });

    act(() => emit(change));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.lists() });
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('throttles a burst of changes into a single refetch', () => {
    setup({ canAutoRefresh: true, viewKey: 'all' });

    act(() => emit(change));
    now += THROTTLE_MS - 1;
    act(() => emit(change));

    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('refetches again once the throttle window has passed', () => {
    setup({ canAutoRefresh: true, viewKey: 'all' });

    act(() => emit(change));
    now += THROTTLE_MS;
    act(() => emit(change));

    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});

describe('useTicketListRealtime with auto refresh off', () => {
  it('accumulates the unseen count into one toast instead of refetching', () => {
    setup({ canAutoRefresh: false, viewKey: 'all' });

    act(() => emit(change));
    act(() => emit(change));

    expect(invalidate).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledTimes(2);
    expect(mocks.toast.mock.calls[0][0]).toContain('1');
    expect(mocks.toast.mock.calls[1][0]).toContain('2');
    expect(mocks.toast.mock.calls[1][1]).toMatchObject({ id: 'tickets-new' });
  });

  it('refetches and dismisses the toast when the user asks to refresh', () => {
    setup({ canAutoRefresh: false, viewKey: 'all' });
    act(() => emit(change));

    act(() => toastOptions().action.onClick());

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.lists() });
    expect(mocks.toast.dismiss).toHaveBeenCalledWith('tickets-new');
  });

  it('restarts the count after the toast auto-closes', () => {
    setup({ canAutoRefresh: false, viewKey: 'all' });
    act(() => emit(change));
    act(() => emit(change));

    act(() => toastOptions().onAutoClose());
    act(() => emit(change));

    expect(mocks.toast.mock.calls.at(-1)?.[0]).toContain('1');
  });

  it('drops a stale count when the user switches view', () => {
    const { rerender } = setup({ canAutoRefresh: false, viewKey: 'all' });
    act(() => emit(change));

    rerender({ canAutoRefresh: false, viewKey: 'mine' });
    act(() => emit(change));

    expect(mocks.toast.dismiss).toHaveBeenCalledWith('tickets-new');
    expect(mocks.toast.mock.calls.at(-1)?.[0]).toContain('1');
  });

  it('unsubscribes and clears the toast on unmount', () => {
    const { unmount } = setup({ canAutoRefresh: false, viewKey: 'all' });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
    expect(mocks.toast.dismiss).toHaveBeenCalledWith('tickets-new');
  });
});
