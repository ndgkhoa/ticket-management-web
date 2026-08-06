import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PresenceMember, RealtimeChange } from '~/lib/realtime';
import type * as RealtimeModule from '~/lib/realtime';

const mocks = vi.hoisted(() => ({
  channel: {
    on: vi.fn(),
    subscribe: vi.fn(),
    presenceState: vi.fn(),
    track: vi.fn(),
  },
  supabase: { channel: vi.fn(), removeChannel: vi.fn() },
}));

vi.mock('~/lib/supabase', () => ({ supabase: mocks.supabase }));

let realtime: typeof RealtimeModule;

const self: PresenceMember = { id: 'u1', name: 'Aiko Tanaka', avatarUrl: null };

const onChangeHandler = () =>
  mocks.channel.on.mock.calls[0][2] as (payload: Record<string, unknown>) => void;

const presenceSyncHandler = () => mocks.channel.on.mock.calls[0][2] as () => void;

const subscribeCallback = () => mocks.channel.subscribe.mock.calls[0][0] as (s: string) => void;

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.channel.on.mockReturnValue(mocks.channel);
  mocks.channel.subscribe.mockReturnValue(mocks.channel);
  mocks.channel.presenceState.mockReturnValue({});
  mocks.supabase.channel.mockReturnValue(mocks.channel);

  vi.resetModules();
  realtime = await import('~/lib/realtime');
});

describe('subscribeTable', () => {
  it('opens a uniquely named channel per table and subscribes to every change', () => {
    realtime.subscribeTable('tickets', vi.fn());

    expect(mocks.supabase.channel).toHaveBeenCalledWith(expect.stringMatching(/^db-tickets-.+/));
    expect(mocks.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tickets' },
      expect.any(Function)
    );
    expect(mocks.channel.subscribe).toHaveBeenCalled();
  });

  it('gives each subscription its own channel name', () => {
    realtime.subscribeTable('tickets', vi.fn());
    realtime.subscribeTable('tickets', vi.fn());

    const [first] = mocks.supabase.channel.mock.calls[0];
    const [second] = mocks.supabase.channel.mock.calls[1];
    expect(first).not.toBe(second);
  });

  it('narrows a postgres payload down to eventType, new and old', () => {
    const onChange = vi.fn();
    realtime.subscribeTable('tickets', onChange);

    onChangeHandler()({
      eventType: 'UPDATE',
      new: { id: 't1', status: 'closed' },
      old: { id: 't1', status: 'open' },
      schema: 'public',
      table: 'tickets',
    });

    expect(onChange).toHaveBeenCalledWith({
      eventType: 'UPDATE',
      new: { id: 't1', status: 'closed' },
      old: { id: 't1', status: 'open' },
    } satisfies RealtimeChange);
  });

  it('reports a missing row as null rather than undefined', () => {
    const onChange = vi.fn();
    realtime.subscribeTable('tickets', onChange);

    onChangeHandler()({ eventType: 'DELETE', old: { id: 't1' } });

    expect(onChange).toHaveBeenCalledWith({
      eventType: 'DELETE',
      new: null,
      old: { id: 't1' },
    });
  });

  it('removes the channel on unsubscribe', () => {
    const unsubscribe = realtime.subscribeTable('tickets', vi.fn());
    expect(mocks.supabase.removeChannel).not.toHaveBeenCalled();

    unsubscribe();

    expect(mocks.supabase.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });
});

describe('joinPresence', () => {
  it('keys the channel by the joining member', () => {
    realtime.joinPresence('ticket:t1', self, vi.fn());

    expect(mocks.supabase.channel).toHaveBeenCalledWith('ticket:t1', {
      config: { presence: { key: 'u1' } },
    });
  });

  it('collapses duplicate presence entries for the same member', () => {
    const onSync = vi.fn();
    realtime.joinPresence('ticket:t1', self, onSync);
    mocks.channel.presenceState.mockReturnValue({
      u1: [{ id: 'u1', name: 'Aiko Tanaka', avatarUrl: null }],
      u2: [
        { id: 'u2', name: 'Adrian Cole', avatarUrl: 'a.png' },
        { id: 'u2', name: 'Adrian Cole', avatarUrl: 'a.png' },
      ],
    });

    presenceSyncHandler()();

    expect(onSync).toHaveBeenCalledWith([
      { id: 'u1', name: 'Aiko Tanaka', avatarUrl: null },
      { id: 'u2', name: 'Adrian Cole', avatarUrl: 'a.png' },
    ]);
  });

  it('announces itself only once the channel is subscribed', () => {
    realtime.joinPresence('ticket:t1', self, vi.fn());

    subscribeCallback()('TIMED_OUT');
    expect(mocks.channel.track).not.toHaveBeenCalled();

    subscribeCallback()('SUBSCRIBED');
    expect(mocks.channel.track).toHaveBeenCalledWith(self);
  });

  it('removes the channel on leave', () => {
    realtime.joinPresence('ticket:t1', self, vi.fn())();

    expect(mocks.supabase.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });
});

describe('registerRealtimeTransport', () => {
  it('routes table subscriptions through the registered transport', () => {
    const unsubscribe = vi.fn();
    const subscribeTable = vi.fn().mockReturnValue(unsubscribe);
    realtime.registerRealtimeTransport({ subscribeTable, joinPresence: vi.fn() });
    const onChange = vi.fn();

    const result = realtime.subscribeTable('tickets', onChange);

    expect(subscribeTable).toHaveBeenCalledWith('tickets', onChange);
    expect(result).toBe(unsubscribe);
    expect(mocks.supabase.channel).not.toHaveBeenCalled();
  });

  it('routes presence through the registered transport', () => {
    const leave = vi.fn();
    const joinPresence = vi.fn().mockReturnValue(leave);
    realtime.registerRealtimeTransport({ subscribeTable: vi.fn(), joinPresence });
    const onSync = vi.fn();

    const result = realtime.joinPresence('ticket:t1', self, onSync);

    expect(joinPresence).toHaveBeenCalledWith('ticket:t1', self, onSync);
    expect(result).toBe(leave);
    expect(mocks.supabase.channel).not.toHaveBeenCalled();
  });
});
