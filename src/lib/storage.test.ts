import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { revokeAttachmentUrl, uploadAttachment } from '~/lib/storage';

/**
 * The upload facade in MSW mode (the suite runs `VITE_API_MODE=msw`): bytes become an in-memory
 * object URL rather than a Storage upload, and only those object URLs get revoked.
 */
describe('attachment storage (msw mode)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns a ticket-scoped path and an object url', async () => {
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });

    const result = await uploadAttachment('ticket-1', file);

    expect(result.path).toMatch(/^ticket-1\/.+-note\.txt$/);
    expect(result.url).toBe('blob:mock-url');
  });

  it('revokes object urls but leaves live http urls alone', () => {
    revokeAttachmentUrl('blob:mock-url');
    revokeAttachmentUrl('https://example.com/file.png');

    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
