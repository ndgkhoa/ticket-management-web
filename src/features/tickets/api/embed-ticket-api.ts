import { z } from 'zod';

import { invokeAiFunction, isAiEnabled } from '~/features/tickets/api/ai-client';

const embedResultSchema = z.object({ ok: z.boolean() });

export function embedTicketInBackground(ticketId: string): void {
  if (!isAiEnabled) return;
  void invokeAiFunction('embed-ticket', { ticketId }, embedResultSchema).catch(() => {});
}
