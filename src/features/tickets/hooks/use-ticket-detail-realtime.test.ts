import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { Session } from '@supabase/supabase-js';

import {
  registerRealtimeTransport,
  type PresenceMember,
  type RealtimeChange,
} from '~/lib/realtime';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import { useAuthStore } from '~/stores/auth';
import { useTicketDetailRealtime } from '~/features/tickets/hooks/use-ticket-detail-realtime';
import { act, renderHookWithProviders } from '~/testing/render';

const TICKET_ID = 't1';

let emit: (change: RealtimeChange) => void;
let presence: {
  topic?: string;
  self?: PresenceMember;
  sync?: (members: PresenceMember[]) => void;
  leave: Mock<() => void>;
  joined: number;
};

const setup = (trackPresence?: boolean) => {
  const rendered = renderHookWithProviders(() => useTicketDetailRealtime(TICKET_ID, trackPresence));
  const invalidate = vi
    .spyOn(rendered.queryClient, 'invalidateQueries')
    .mockResolvedValue(undefined);
  return { ...rendered, invalidate };
};

const signIn = (metadata: Record<string, unknown> = {}) =>
  useAuthStore.getState().applySession(
    {
      user: { id: 'u1', email: 'me@example.com', user_metadata: metadata },
    } as unknown as Session,
    new Set()
  );

beforeEach(() => {
  vi.clearAllMocks();
  presence = { leave: vi.fn<() => void>(), joined: 0 };
  registerRealtimeTransport({
    subscribeTable: (_table, onChange) => {
      emit = onChange;
      return vi.fn<() => void>();
    },
    joinPresence: (topic, self, onSync) => {
      presence.joined += 1;
      presence.topic = topic;
      presence.self = self;
      presence.sync = onSync;
      return presence.leave;
    },
  });
});

afterEach(() =>
  useAuthStore.setState({ session: null, user: null, status: 'loading', permissions: new Set() })
);

describe('useTicketDetailRealtime message stream', () => {
  it('refreshes messages and events for a change on this ticket', () => {
    signIn();
    const { invalidate } = setup();

    act(() => emit({ eventType: 'INSERT', new: { ticket_id: TICKET_ID }, old: null }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.messages(TICKET_ID) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.events(TICKET_ID) });
  });

  it('falls back to the old row when a message is deleted', () => {
    signIn();
    const { invalidate } = setup();

    act(() => emit({ eventType: 'DELETE', new: null, old: { ticket_id: TICKET_ID } }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ticketKeys.messages(TICKET_ID) });
  });

  it('ignores changes belonging to another ticket', () => {
    signIn();
    const { invalidate } = setup();

    act(() => emit({ eventType: 'INSERT', new: { ticket_id: 'other' }, old: null }));

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useTicketDetailRealtime presence', () => {
  it('joins the ticket topic with the display name from user metadata', () => {
    signIn({ full_name: 'Khoa', avatar_url: 'khoa.png' });
    setup();

    expect(presence.topic).toBe(`ticket:${TICKET_ID}`);
    expect(presence.self).toEqual({ id: 'u1', name: 'Khoa', avatarUrl: 'khoa.png' });
  });

  it('falls back to the email when metadata carries no name', () => {
    signIn();
    setup();

    expect(presence.self).toEqual({ id: 'u1', name: 'me@example.com', avatarUrl: null });
  });

  it('reports the other viewers and leaves itself out', () => {
    signIn();
    const { result } = setup();

    act(() =>
      presence.sync?.([
        { id: 'u1', name: 'me@example.com', avatarUrl: null },
        { id: 'u2', name: 'Mai', avatarUrl: null },
      ])
    );

    expect(result.current).toEqual([{ id: 'u2', name: 'Mai', avatarUrl: null }]);
  });

  it('leaves the topic on unmount', () => {
    signIn();
    const { unmount } = setup();

    unmount();

    expect(presence.leave).toHaveBeenCalled();
  });

  it('does not join while signed out', () => {
    setup();

    expect(presence.joined).toBe(0);
  });

  it('skips presence entirely when tracking is disabled', () => {
    signIn();
    const { result } = setup(false);

    expect(presence.joined).toBe(0);
    expect(result.current).toEqual([]);
  });
});
