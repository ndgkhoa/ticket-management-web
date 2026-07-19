import { Loader2, Paperclip, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '~/components/ui';
import { cn } from '~/utils/cn';
import { useAuthStore } from '~/stores/auth';
import { revokeAttachmentUrl } from '~/lib/storage';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';
import {
  useRemoveAttachment,
  useTicketAttachments,
  useUploadAttachment,
} from '~/features/tickets/api/attachment-queries';
import type { Attachment } from '~/features/tickets/schemas/attachment-schema';

type Props = { ticketId: string };

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif)$/i;

/** Human file size — bytes → KB/MB, one decimal. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A file name that truncates in the MIDDLE, keeping the extension visible — the head shrinks
 * with an ellipsis while the tail (last few chars + extension) always shows, so `.pdf`/`.png`
 * never gets cut off. Done with two spans rather than a JS char count so it stays responsive.
 */
function FileName({ name }: { name: string }) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const tail = base.slice(-3) + ext;
  const head = base.slice(0, -3);
  return (
    <span className="flex min-w-0 flex-1">
      <span className="truncate">{head}</span>
      <span className="shrink-0">{tail}</span>
    </span>
  );
}

function AttachmentRow({
  attachment,
  ownedByMe,
  onRemove,
}: {
  attachment: Attachment;
  ownedByMe: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const isImage = IMAGE_EXTENSIONS.test(attachment.fileName);

  return (
    <li className="group hover:bg-accent flex items-center gap-2 rounded px-1 py-1 text-sm">
      {isImage ? (
        <img
          src={attachment.fileUrl}
          alt={attachment.fileName}
          className="size-8 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded">
          <Paperclip className="text-muted-foreground size-4" />
        </span>
      )}
      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noreferrer"
        download={attachment.fileName}
        aria-label={attachment.fileName}
        title={attachment.fileName}
        className="hover:text-primary flex min-w-0 flex-1 hover:underline"
      >
        <FileName name={attachment.fileName} />
      </a>
      <span className="text-muted-foreground shrink-0 text-xs">
        {formatSize(attachment.sizeBytes)}
      </span>
      {ownedByMe && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={t('Common.Delete', { name: attachment.fileName })}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </li>
  );
}

/**
 * Ticket attachments: drag-drop (or click) to upload, and a list with thumbnails, download
 * links, and middle-truncated names. Upload goes through the storage facade — a Supabase bucket
 * live, an in-memory object URL in the demo — then records the row. Only the uploader deletes.
 */
/** How long an upload's progress bar stays on screen at minimum — so an instant (mock) upload
 *  still reads as a real transfer rather than a one-frame flash. */
const MIN_UPLOAD_MS = 700;

type UploadProgress = { id: string; name: string; percent: number };

export function TicketAttachments({ ticketId }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: attachments = [] } = useTicketAttachments(ticketId);
  const upload = useUploadAttachment(ticketId);
  const remove = useRemoveAttachment(ticketId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  // Pending interval/timeout ids, cleared on unmount so a navigation mid-upload leaves nothing
  // running.
  const timers = useRef<Set<number>>(new Set());
  useEffect(() => {
    const pending = timers.current;
    return () =>
      pending.forEach((id) => {
        window.clearTimeout(id);
        window.clearInterval(id);
      });
  }, []);

  const startUpload = (file: File) => {
    const id = crypto.randomUUID();
    const startedAt = Date.now();
    setUploads((current) => [...current, { id, name: file.name, percent: 8 }]);

    // Creep toward 90% while the upload runs; the real completion snaps it to 100.
    const timer = window.setInterval(() => {
      setUploads((current) =>
        current.map((item) =>
          item.id === id ? { ...item, percent: Math.min(90, item.percent + 12) } : item
        )
      );
    }, 100);
    timers.current.add(timer);

    const finish = () => {
      window.clearInterval(timer);
      timers.current.delete(timer);
      setUploads((current) =>
        current.map((item) => (item.id === id ? { ...item, percent: 100 } : item))
      );
      const removal = window.setTimeout(() => {
        setUploads((current) => current.filter((item) => item.id !== id));
        timers.current.delete(removal);
        // Refresh the list now, as the bar leaves — so the new row appears in its place rather
        // than on top of a still-running progress bar.
        void queryClient.invalidateQueries({ queryKey: ticketKeys.attachments(ticketId) });
      }, 350);
      timers.current.add(removal);
    };

    upload.mutate(file, {
      // Hold the bar for a minimum so a mock (instant) upload still animates.
      onSuccess: () => {
        const hold = window.setTimeout(
          finish,
          Math.max(0, MIN_UPLOAD_MS - (Date.now() - startedAt))
        );
        timers.current.add(hold);
      },
      onError: (error) => {
        window.clearInterval(timer);
        timers.current.delete(timer);
        setUploads((current) => current.filter((item) => item.id !== id));
        toast.error(error.message);
      },
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) startUpload(file);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          'text-muted-foreground hover:border-primary/60 flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed p-4 text-center text-sm transition-colors',
          dragging && 'border-primary bg-accent'
        )}
      >
        <UploadCloud className="size-5" />
        {t('Tickets.DropFiles')}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {uploads.map((item) => (
        <div key={item.id} className="px-1">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
            <span className="min-w-0 flex-1">
              <FileName name={item.name} />
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">{item.percent}%</span>
          </div>
          <div className="bg-muted mt-1 h-1 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-200 ease-out"
              style={{ width: `${item.percent}%` }}
            />
          </div>
        </div>
      ))}

      {attachments.length === 0 && uploads.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('Tickets.NoAttachments')}</p>
      ) : (
        <ul className="space-y-0.5">
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              ownedByMe={attachment.uploadedBy === currentUserId}
              onRemove={() =>
                remove.mutate(attachment.id, {
                  onSuccess: () => revokeAttachmentUrl(attachment.fileUrl),
                  onError: (error) => toast.error(error.message),
                })
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
