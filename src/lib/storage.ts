import { env } from '~/config/env';
import { supabase } from '~/lib/supabase';

/**
 * Attachment upload facade. Live mode puts the file in a Supabase Storage bucket and returns a
 * public URL; `msw` mode keeps the bytes in memory as an object URL. Either way the caller gets
 * back a `{ path, url }` it stores on the `attachments` row — so the same upload flow runs the
 * demo and the live project.
 *
 * The public URL keeps the demo simple; a real deployment would make the bucket private and
 * hand out short-lived signed URLs instead (the `attachments` table RLS already scopes who can
 * see the metadata that carries the link).
 */

const BUCKET = 'attachments';
const isMsw = env.VITE_API_MODE === 'msw';

export type UploadedFile = { path: string; url: string };

export async function uploadAttachment(ticketId: string, file: File): Promise<UploadedFile> {
  const path = `${ticketId}/${crypto.randomUUID()}-${file.name}`;

  if (isMsw) {
    return { path, url: URL.createObjectURL(file) };
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/** Free a mock object URL when its attachment is deleted; a no-op for live http(s) URLs. */
export function revokeAttachmentUrl(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}
