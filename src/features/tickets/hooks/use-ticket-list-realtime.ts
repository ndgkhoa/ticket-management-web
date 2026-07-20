import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { subscribeTable } from '~/lib/realtime';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

type Args = {
  canAutoRefresh: boolean;
  viewKey: string;
};

const THROTTLE_MS = 1500;
const TOAST_ID = 'tickets-new';

export function useTicketListRealtime({ canAutoRefresh, viewKey }: Args) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const count = useRef(0);
  const lastRefetch = useRef(0);
  const canAuto = useRef(canAutoRefresh);
  canAuto.current = canAutoRefresh;
  const translate = useRef(t);
  translate.current = t;

  const refresh = useCallback(() => {
    count.current = 0;
    lastRefetch.current = Date.now();
    toast.dismiss(TOAST_ID);
    void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = subscribeTable('tickets', () => {
      if (canAuto.current) {
        const now = Date.now();
        if (now - lastRefetch.current < THROTTLE_MS) return;
        lastRefetch.current = now;
        void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        return;
      }
      count.current += 1;
      toast(translate.current('Tickets.NewTickets', { count: count.current }), {
        id: TOAST_ID,
        duration: 10_000,
        action: { label: translate.current('Common.Refresh'), onClick: refresh },
        onAutoClose: () => {
          count.current = 0;
        },
      });
    });
    return () => {
      unsubscribe();
      toast.dismiss(TOAST_ID);
    };
  }, [queryClient, refresh]);

  useEffect(() => {
    count.current = 0;
    toast.dismiss(TOAST_ID);
  }, [viewKey]);
}
