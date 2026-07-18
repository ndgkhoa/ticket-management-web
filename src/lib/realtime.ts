import { supabase } from '~/lib/supabase';

/**
 * Realtime facade. Live mode talks to Supabase Realtime (postgres changes + presence over a
 * websocket); `msw` mode swaps in a BroadcastChannel transport that the mock bootstrap
 * registers at startup. Feature code calls `subscribeTable` / `joinPresence` and never knows
 * which is behind it — so the same code that runs the demo also runs against the live project.
 *
 * The mock transport is *registered*, not imported here, so the live bundle never pulls in the
 * mock (and its fixtures): `registerRealtimeTransport` is called only from the msw bootstrap.
 */

export type RealtimeChange<Row = Record<string, unknown>> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Row | null;
  old: Partial<Row> | null;
};

export type PresenceMember = { id: string; name: string; avatarUrl: string | null };

export type RealtimeTransport = {
  subscribeTable: (table: string, onChange: (change: RealtimeChange) => void) => () => void;
  joinPresence: (
    topic: string,
    self: PresenceMember,
    onSync: (members: PresenceMember[]) => void
  ) => () => void;
};

let mockTransport: RealtimeTransport | null = null;

/** Called once by the msw bootstrap to route realtime through the BroadcastChannel mock. */
export function registerRealtimeTransport(transport: RealtimeTransport) {
  mockTransport = transport;
}

/** Subscribe to INSERT/UPDATE/DELETE on a table. Returns an unsubscribe function. */
export function subscribeTable(
  table: string,
  onChange: (change: RealtimeChange) => void
): () => void {
  if (mockTransport) return mockTransport.subscribeTable(table, onChange);

  // Unique channel name per subscription — two subscribers (or a StrictMode double-mount) sharing
  // one topic makes supabase-js reject the second "subscribe multiple times".
  const channel = supabase
    .channel(`db-${table}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) =>
      onChange({
        eventType: payload.eventType as RealtimeChange['eventType'],
        new: (payload.new as Record<string, unknown>) ?? null,
        old: (payload.old as Record<string, unknown>) ?? null,
      })
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Join a presence topic, announce `self`, and receive the current member list on every sync. */
export function joinPresence(
  topic: string,
  self: PresenceMember,
  onSync: (members: PresenceMember[]) => void
): () => void {
  if (mockTransport) return mockTransport.joinPresence(topic, self, onSync);

  const channel = supabase.channel(topic, { config: { presence: { key: self.id } } });
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceMember>();
      // Dedup by user id: one person with several tabs (or re-tracks) registers multiple presence
      // metas, and showing each would put five avatars behind two tabs. One avatar per user.
      const byId = new Map<string, PresenceMember>();
      for (const member of Object.values(state).flat()) {
        byId.set(member.id, { id: member.id, name: member.name, avatarUrl: member.avatarUrl });
      }
      onSync([...byId.values()]);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track(self);
    });
  return () => {
    void supabase.removeChannel(channel);
  };
}
