import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { joinPresence, subscribeTable, type PresenceMember } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

/**
 * Realtime for the ticket detail — the opposite of the list. The conversation is append-only,
 * so a new message from another viewer refetches the timeline (and the activity feed) rather
 * than feeding a pill — the message simply appears at the bottom, which is where it belongs.
 * Presence tracks who else is viewing this ticket and returns them for the header.
 *
 * `trackPresence` (default on) gates only the presence roster, not the live thread: a customer
 * still gets their conversation refetched on a new message, but does not join presence — so they
 * are never shown the agents viewing their ticket (and don't broadcast themselves either).
 */
export function useTicketDetailRealtime(ticketId: string, trackPresence = true): PresenceMember[] {
  const queryClient = useQueryClient();
  // Only the id is a dependency — the user object can get a new ref on unrelated auth-store
  // updates, and re-joining presence each time would pile up stale entries.
  const userId = useAuthStore((state) => state.user?.id);
  const [members, setMembers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeTable('ticket_messages', (change) => {
      const row = (change.new ?? change.old) as Record<string, unknown> | null;
      if (row?.ticket_id !== ticketId) return;
      void queryClient.invalidateQueries({ queryKey: ticketKeys.messages(ticketId) });
      void queryClient.invalidateQueries({ queryKey: ticketKeys.events(ticketId) });
    });
    return unsubscribe;
  }, [ticketId, queryClient]);

  useEffect(() => {
    if (!trackPresence) return;
    const user = useAuthStore.getState().user;
    if (!user) return;
    const metadata = user.user_metadata ?? {};
    const self: PresenceMember = {
      id: user.id,
      name: (metadata.full_name as string) ?? user.email ?? '—',
      avatarUrl: (metadata.avatar_url as string) ?? null,
    };
    return joinPresence(`ticket:${ticketId}`, self, setMembers);
  }, [ticketId, userId, trackPresence]);

  // Presence shows who ELSE is here — drop yourself; you know you're viewing.
  return trackPresence ? members.filter((member) => member.id !== userId) : [];
}
