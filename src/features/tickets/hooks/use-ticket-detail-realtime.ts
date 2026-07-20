import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { joinPresence, subscribeTable, type PresenceMember } from '~/lib/realtime';
import { useAuthStore } from '~/stores/auth';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

export function useTicketDetailRealtime(ticketId: string, trackPresence = true): PresenceMember[] {
  const queryClient = useQueryClient();
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

  return trackPresence ? members.filter((member) => member.id !== userId) : [];
}
