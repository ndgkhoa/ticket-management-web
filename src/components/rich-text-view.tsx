import DOMPurify from 'dompurify';

import { cn } from '~/utils/cn';

type Props = {
  html: string;
  className?: string;
};

export function RichTextView({ html, className }: Props) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
