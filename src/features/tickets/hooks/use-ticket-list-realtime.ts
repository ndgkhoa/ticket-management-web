import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { subscribeTable } from '~/lib/realtime';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

type Args = {
  /**
   * Whether it's safe to refetch silently when a ticket changes — true only on page 1 with the
   * default sort, no active filter/search/selection, and the tab focused. When false the change
   * is surfaced as a toast with a Refresh action instead, so the table never shifts under the
   * cursor and nothing is covered.
   */
  canAutoRefresh: boolean;
  /** A signature of the current view (filters/sort/page). When it changes, the pending count is
   *  stale, so the toast is dismissed. */
  viewKey: string;
};

const THROTTLE_MS = 1500;
const TOAST_ID = 'tickets-new';

/**
 * Realtime for the ticket list. A new/changed ticket either triggers a throttled quiet refetch
 * (when safe) or raises a single, count-updating toast — "N new tickets" with a Refresh action —
 * rather than splicing into the paged cache or covering the table. Clicking Refresh refetches.
 */
export function useTicketListRealtime({ canAutoRefresh, viewKey }: Args) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const count = useRef(0);
  const lastRefetch = useRef(0);
  const canAuto = useRef(canAutoRefresh);
  canAuto.current = canAutoRefresh;
  // Read the latest `t` inside the subscription without re-subscribing on a language change.
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
        // Throttle: a busy queue fires in bursts, and one refetch per event is a storm.
        const now = Date.now();
        if (now - lastRefetch.current < THROTTLE_MS) return;
        lastRefetch.current = now;
        void queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        return;
      }
      count.current += 1;
      // One toast, updated in place by its stable id — never a stack of them. Auto-dismisses
      // after a spell; a further event re-surfaces it with the running count.
      toast(translate.current('Tickets.NewTickets', { count: count.current }), {
        id: TOAST_ID,
        duration: 10_000,
        action: { label: translate.current('Common.Refresh'), onClick: refresh },
        // Once it fades on its own, start the count fresh so the next one reads "1 new",
        // not a total carried over from a notice the user already stopped seeing.
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

  // A change of view (filters/sort/page/search) makes the pending "new" count meaningless.
  useEffect(() => {
    count.current = 0;
    toast.dismiss(TOAST_ID);
  }, [viewKey]);
}
