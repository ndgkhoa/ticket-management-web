import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

vi.mock('~/lib/storage', () => ({
  uploadAttachment: vi.fn(async (ticketId: string, file: File) => ({
    path: `${ticketId}/x`,
    url: `blob:mock/${file.name}`,
  })),
  revokeAttachmentUrl: vi.fn(),
}));

import { useAuthStore } from '~/stores/auth';
import { attachmentApi } from '~/features/tickets/api/attachment-api';
import { ticketRows } from '~/mocks/fixtures';

const USER_ID = ticketRows[0].requester_id;
const TICKET_ID = ticketRows[0].id;

describe('attachmentApi over MSW', () => {
  beforeEach(() => useAuthStore.setState({ user: { id: USER_ID } as User }));
  afterEach(() => useAuthStore.setState({ user: null }));

  it('uploads a file and records the row', async () => {
    const file = new File(['steps to reproduce'], 'runbook.txt', { type: 'text/plain' });

    const attachment = await attachmentApi.create(TICKET_ID, file);

    expect(attachment.fileName).toBe('runbook.txt');
    expect(attachment.ticketId).toBe(TICKET_ID);
    expect(attachment.uploadedBy).toBe(USER_ID);
    expect(attachment.fileUrl).toContain('runbook.txt');
  });

  it('lists and removes an attachment', async () => {
    const created = await attachmentApi.create(
      TICKET_ID,
      new File(['x'], 'diagram.png', { type: 'image/png' })
    );

    const listed = await attachmentApi.list(TICKET_ID);
    expect(listed.some((row) => row.id === created.id)).toBe(true);

    await attachmentApi.remove(created.id);

    const after = await attachmentApi.list(TICKET_ID);
    expect(after.some((row) => row.id === created.id)).toBe(false);
  });
});
