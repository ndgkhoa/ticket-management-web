import { z } from 'zod';

import { invokeAiFunction, isAiEnabled } from '~/features/tickets/api/ai-client';

const embedResultSchema = z.object({ ok: z.boolean() });

/**
 * Fire-and-forget request to (re)compute a ticket's semantic embedding after it is
 * created or its subject/description changes.
 *
 * Best-effort by design: a missing embedding only means the ticket won't surface in
 * semantic results until it's next embedded — it must never fail the create/update the
 * user actually asked for. So errors are swallowed here, and callers do not await it on
 * the critical path. Skipped entirely when AI is disabled.
 */
export function embedTicketInBackground(ticketId: string): void {
  if (!isAiEnabled) return;
  void invokeAiFunction('embed-ticket', { ticketId }, embedResultSchema).catch(() => {
    // Intentionally ignored — see the note above.
  });
}
