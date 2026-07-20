import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { http, HttpResponse } from 'msw';

import '~/i18n';
import { render, screen } from '~/testing/render';
import { server } from '~/mocks/server';
import { useAuthStore } from '~/stores/auth';
import { cannedResponseRows } from '~/mocks/fixtures';
import { cannedResponseKeys } from '~/features/admin/canned-responses/constants/canned-response-keys';
import type { TicketMessage } from '~/features/tickets/schemas/ticket-message-schema';
import { AiSuggestionPanel } from '~/features/tickets/components/ai-suggestion-panel';

const message: TicketMessage = {
  id: '00000000-0000-4000-8000-000000000001',
  ticketId: '00000000-0000-4000-8000-0000000000aa',
  authorId: cannedResponseRows[0].created_by,
  type: 'public_reply',
  body: 'I still need a refund',
  createdAt: '2026-07-01T00:00:00.000Z',
};

describe('AiSuggestionPanel canned-response context', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: cannedResponseRows[0].created_by } as User,
      permissions: new Set(['canned.read']),
      status: 'authenticated',
    });
  });
  afterEach(() => useAuthStore.setState({ user: null, permissions: new Set(), status: 'loading' }));

  it('forwards the canned-response bodies to ai-suggest-reply', async () => {
    let sentBody: { cannedResponses?: string[] } | undefined;
    server.use(
      http.post('*/functions/v1/ai-suggest-reply', async ({ request }) => {
        sentBody = (await request.json()) as { cannedResponses?: string[] };
        return HttpResponse.json({ draft: 'ok' });
      })
    );

    const { user, queryClient } = await render(
      <AiSuggestionPanel
        subject="Refund request"
        messages={[message]}
        authorNameById={new Map()}
        onUseDraft={vi.fn()}
      />
    );

    await vi.waitFor(() =>
      expect(queryClient.getQueryData([...cannedResponseKeys.all, 'library'])).toBeDefined()
    );
    await user.click(await screen.findByRole('button', { name: /Draft reply/i }));

    await vi.waitFor(() => expect(sentBody?.cannedResponses).toBeDefined());
    expect(sentBody?.cannedResponses).toEqual(
      expect.arrayContaining(cannedResponseRows.map((response) => response.body))
    );
    expect(sentBody?.cannedResponses).toHaveLength(cannedResponseRows.length);
  });
});
