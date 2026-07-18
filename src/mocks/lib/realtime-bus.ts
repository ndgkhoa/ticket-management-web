import {
  registerRealtimeTransport,
  type PresenceMember,
  type RealtimeChange,
  type RealtimeTransport,
} from '~/lib/realtime';
import { ticketStore } from '~/mocks/stores/ticket-store';
import { ticketMessageStore } from '~/mocks/stores/ticket-message-store';
import type { TicketRow } from '~/mocks/fixtures/row-types';

/**
 * The `msw`-mode realtime transport, over a BroadcastChannel shared by every tab of the demo.
 * It plays the part Supabase Realtime plays live: writes broadcast a change (so other tabs
 * react — the "N new" list pill, a spliced-in reply), and presence tracks who's viewing.
 *
 * A synthetic activity generator stands in for "other users" so a single tab still sees the
 * feature move; opening a second tab makes it genuinely cross-session. Each tab keeps its own
 * in-memory store, so a received change is applied to this tab's store before subscribers are
 * notified — that keeps a later refetch consistent with what the pill promised.
 */

const CHANNEL_NAME = 'ticket-realtime';

// Identifies this tab, so a tab ignores the messages it itself published (two
// BroadcastChannel instances in one page DO deliver to each other — only the exact sending
// instance is skipped). The publishing tab already has the write; only other tabs react.
const SENDER_ID = typeof crypto !== 'undefined' ? crypto.randomUUID() : 'server';

type BusMessage = { sender: string } & (
  | { kind: 'change'; table: string; change: RealtimeChange }
  | { kind: 'presence'; topic: string; member: PresenceMember; state: 'join' | 'leave' }
);

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
}

// One channel for outbound publishing from the write handlers, created lazily.
let publisher: BroadcastChannel | null | undefined;
export function publishChange(table: string, change: RealtimeChange): void {
  if (publisher === undefined) publisher = openChannel();
  publisher?.postMessage({ sender: SENDER_ID, kind: 'change', table, change } satisfies BusMessage);
}

/** Apply a received change to this tab's store so a refetch agrees with the notification. */
function applyToStore(table: string, change: RealtimeChange): void {
  const store =
    table === 'tickets' ? ticketStore : table === 'ticket_messages' ? ticketMessageStore : null;
  if (!store) return;
  const row = change.new as ({ id: string } & Record<string, unknown>) | null;
  if (change.eventType === 'INSERT' && row) store.insert(row as never);
  else if (change.eventType === 'UPDATE' && row) store.update(row.id, row as never);
  else if (change.eventType === 'DELETE' && change.old?.id) store.remove(String(change.old.id));
}

function createTransport(): RealtimeTransport {
  const tableSubs = new Map<string, Set<(change: RealtimeChange) => void>>();
  // Per topic: our own local viewers and the ones learned from other tabs.
  const presence = new Map<
    string,
    {
      local: Map<string, PresenceMember>;
      remote: Map<string, PresenceMember>;
      listeners: Set<(m: PresenceMember[]) => void>;
    }
  >();
  const rx = openChannel();

  const notifyPresence = (topic: string) => {
    const entry = presence.get(topic);
    if (!entry) return;
    const members = [...entry.local.values(), ...entry.remote.values()];
    entry.listeners.forEach((cb) => cb(members));
  };

  rx?.addEventListener('message', (event) => {
    const message = event.data as BusMessage;
    if (message.sender === SENDER_ID) return; // our own write — already applied locally
    if (message.kind === 'change') {
      applyToStore(message.table, message.change);
      tableSubs.get(message.table)?.forEach((cb) => cb(message.change));
      return;
    }
    const entry = presence.get(message.topic);
    if (!entry) return;
    if (message.state === 'join') {
      entry.remote.set(message.member.id, message.member);
      // A newcomer doesn't know who's already here — re-announce our own viewers to it.
      for (const self of entry.local.values()) {
        publisher ??= openChannel();
        publisher?.postMessage({
          sender: SENDER_ID,
          kind: 'presence',
          topic: message.topic,
          member: self,
          state: 'join',
        } satisfies BusMessage);
      }
    } else {
      entry.remote.delete(message.member.id);
    }
    notifyPresence(message.topic);
  });

  return {
    subscribeTable(table, onChange) {
      const set = tableSubs.get(table) ?? new Set();
      set.add(onChange);
      tableSubs.set(table, set);
      return () => set.delete(onChange);
    },
    joinPresence(topic, self, onSync) {
      const entry = presence.get(topic) ?? {
        local: new Map(),
        remote: new Map(),
        listeners: new Set(),
      };
      entry.local.set(self.id, self);
      entry.listeners.add(onSync);
      presence.set(topic, entry);
      onSync([...entry.local.values(), ...entry.remote.values()]);

      publisher ??= openChannel();
      publisher?.postMessage({
        sender: SENDER_ID,
        kind: 'presence',
        topic,
        member: self,
        state: 'join',
      } satisfies BusMessage);

      return () => {
        entry.local.delete(self.id);
        entry.listeners.delete(onSync);
        publisher?.postMessage({
          sender: SENDER_ID,
          kind: 'presence',
          topic,
          member: self,
          state: 'leave',
        } satisfies BusMessage);
      };
    },
  };
}

const SYNTHETIC_SUBJECTS = [
  'Password reset email never arrives',
  'Invoice total looks wrong this month',
  'Mobile app crashes on the login screen',
  'Feature request: dark mode for the portal',
  'Webhook deliveries are delayed by minutes',
];

let syntheticIndex = 0;

/** Stand-in for other users: every ~25s (while the tab is visible) file a fresh ticket. */
function startSyntheticActivity(
  notifyLocal: (table: string, change: RealtimeChange) => void
): void {
  if (typeof window === 'undefined') return;
  window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const template = ticketStore.all()[0] as TicketRow | undefined;
    if (!template) return;

    const now = new Date().toISOString();
    const row: TicketRow = {
      ...template,
      id: crypto.randomUUID(),
      subject: SYNTHETIC_SUBJECTS[syntheticIndex++ % SYNTHETIC_SUBJECTS.length],
      status: 'open',
      assignee_id: null,
      created_at: now,
      updated_at: now,
    };
    ticketStore.insert(row);

    const change: RealtimeChange = { eventType: 'INSERT', new: row as never, old: null };
    notifyLocal('tickets', change); // this tab
    publishChange('tickets', change); // other tabs
  }, 25_000);
}

/** Install the mock transport and start synthetic activity. Called from the msw bootstrap. */
export function installMockRealtime(): void {
  const tableSubs = new Map<string, Set<(change: RealtimeChange) => void>>();
  const transport = createTransport();

  // Wrap subscribeTable so the synthetic generator can notify this tab's subscribers directly
  // (BroadcastChannel doesn't echo to the sender).
  const wrapped: RealtimeTransport = {
    ...transport,
    subscribeTable(table, onChange) {
      const set = tableSubs.get(table) ?? new Set();
      set.add(onChange);
      tableSubs.set(table, set);
      const off = transport.subscribeTable(table, onChange);
      return () => {
        set.delete(onChange);
        off();
      };
    },
  };

  registerRealtimeTransport(wrapped);
  startSyntheticActivity((table, change) => tableSubs.get(table)?.forEach((cb) => cb(change)));
}
