import { supabase } from '~/lib/supabase';

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

export function registerRealtimeTransport(transport: RealtimeTransport) {
  mockTransport = transport;
}

export function subscribeTable(
  table: string,
  onChange: (change: RealtimeChange) => void
): () => void {
  if (mockTransport) return mockTransport.subscribeTable(table, onChange);

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
