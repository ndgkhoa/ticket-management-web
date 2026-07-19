import { z } from 'zod';

import type { Tables } from '~/lib/database.types';

/**
 * Attachment: an `attachments` row as a domain model — a file uploaded against a ticket (or a
 * specific message, when `messageId` is set). `fileUrl` is a directly-usable URL (a live public
 * URL, or a session object URL in the mock).
 */
const attachmentRowSchema = z.object({
  id: z.uuid(),
  ticket_id: z.uuid(),
  message_id: z.uuid().nullable(),
  file_url: z.string(),
  file_name: z.string(),
  size_bytes: z.number(),
  uploaded_by: z.uuid().nullable(),
  created_at: z.string(),
}) satisfies z.ZodType<Tables<'attachments'>>;

export const attachmentSchema = attachmentRowSchema.transform((row) => ({
  id: row.id,
  ticketId: row.ticket_id,
  messageId: row.message_id,
  fileUrl: row.file_url,
  fileName: row.file_name,
  sizeBytes: row.size_bytes,
  uploadedBy: row.uploaded_by,
  createdAt: row.created_at,
}));

export type Attachment = z.infer<typeof attachmentSchema>;

export const ATTACHMENT_COLUMNS =
  'id, ticket_id, message_id, file_url, file_name, size_bytes, uploaded_by, created_at';
