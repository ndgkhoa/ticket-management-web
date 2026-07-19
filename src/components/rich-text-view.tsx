import DOMPurify from 'dompurify';

import { cn } from '~/utils/cn';

type Props = {
  /** HTML produced by the Tiptap composer (or, worst case, posted directly to the API). */
  html: string;
  className?: string;
};

/**
 * Render stored message HTML, sanitised. Message bodies are free text a user controls, and a
 * client could POST arbitrary HTML straight to `ticket_messages.body` — so the string is run
 * through DOMPurify before it ever reaches `dangerouslySetInnerHTML`, stripping scripts and
 * event handlers while keeping the formatting tags the composer emits.
 */
export function RichTextView({ html, className }: Props) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
