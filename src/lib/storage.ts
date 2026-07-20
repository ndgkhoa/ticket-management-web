import { env } from '~/config/env';
import { supabase } from '~/lib/supabase';

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

export function revokeAttachmentUrl(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}
