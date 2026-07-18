import { Bold, Italic, List, ListOrdered, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { Button } from '~/components/ui';
import { cn } from '~/utils/cn';
import { useAuthStore } from '~/stores/auth';
import { useCreateMessage } from '~/features/tickets/api/ticket-message-queries';
import type { MessageType } from '~/features/tickets/schemas/ticket-enums';

type Props = { ticketId: string };

/**
 * The reply / internal-note composer: a Tiptap rich-text editor with a small formatting
 * toolbar and a public/internal toggle. The internal option shows only for staff who hold
 * `message.create.internal` (RLS rejects it otherwise). On send it posts the HTML body and
 * clears the editor.
 */
export function TicketComposer({ ticketId }: Props) {
  const { t } = useTranslation();
  const canInternal = useAuthStore((state) => state.hasPermission('message.create.internal'));
  const createMessage = useCreateMessage(ticketId);
  const [type, setType] = useState<MessageType>('public_reply');

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: { attributes: { class: 'rich-text min-h-24 px-3 py-2' } },
  });

  const submit = () => {
    if (!editor || editor.isEmpty) return;
    createMessage.mutate(
      { ticketId, type, body: editor.getHTML() },
      {
        onSuccess: () => editor.commands.clearContent(),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const toolbarButton = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    label: string
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={active}
      className={cn('size-7', active && 'bg-accent text-accent-foreground')}
      onClick={onClick}
    >
      {icon}
    </Button>
  );

  return (
    <div
      className={cn(
        'rounded-md border',
        type === 'internal_note' && 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20'
      )}
    >
      {canInternal && (
        <div className="flex gap-1 border-b p-1">
          <Button
            type="button"
            variant={type === 'public_reply' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7"
            onClick={() => setType('public_reply')}
          >
            {t('Tickets.PublicReply')}
          </Button>
          <Button
            type="button"
            variant={type === 'internal_note' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7"
            onClick={() => setType('internal_note')}
          >
            {t('Tickets.InternalNote')}
          </Button>
        </div>
      )}

      <div className="flex items-center gap-0.5 border-b p-1">
        {toolbarButton(
          editor?.isActive('bold') ?? false,
          () => editor?.chain().focus().toggleBold().run(),
          <Bold className="size-4" />,
          'Bold'
        )}
        {toolbarButton(
          editor?.isActive('italic') ?? false,
          () => editor?.chain().focus().toggleItalic().run(),
          <Italic className="size-4" />,
          'Italic'
        )}
        {toolbarButton(
          editor?.isActive('bulletList') ?? false,
          () => editor?.chain().focus().toggleBulletList().run(),
          <List className="size-4" />,
          'Bullet list'
        )}
        {toolbarButton(
          editor?.isActive('orderedList') ?? false,
          () => editor?.chain().focus().toggleOrderedList().run(),
          <ListOrdered className="size-4" />,
          'Ordered list'
        )}
      </div>

      <EditorContent editor={editor} />

      <div className="flex justify-end border-t p-2">
        <Button size="sm" onClick={submit} disabled={createMessage.isPending}>
          <Send className="mr-1 size-4" />
          {t('Tickets.Send')}
        </Button>
      </div>
    </div>
  );
}
