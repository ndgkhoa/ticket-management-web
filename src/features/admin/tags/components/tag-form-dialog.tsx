import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';

import { FieldText } from '~/components/form';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';
import { useTagCreate, useTagUpdate } from '~/features/admin/tags/api/tag-queries';
import type { Tag } from '~/features/admin/tags/schemas/tag-schema';

/** Fallback swatch for a new tag — a neutral slate rather than an arbitrary color. */
const DEFAULT_TAG_COLOR = '#64748b';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited, or null/undefined to create a new one. */
  tag?: Tag | null;
};

/**
 * Create/edit dialog for a tag. One form serves both: an absent `tag` is a create,
 * a present one pre-fills for an edit. Mount it with a `key` tied to the target id so
 * the defaults reset when the edited row changes (TanStack Form reads them once).
 */
export function TagFormDialog({ open, onOpenChange, tag }: Props) {
  const { t } = useTranslation();
  const create = useTagCreate();
  const update = useTagUpdate();
  const pending = create.isPending || update.isPending;

  const schema = z.object({
    name: z.string().min(1, t('Validation.Required')),
    color: z.string().min(1, t('Validation.Required')),
  });

  const form = useForm({
    defaultValues: { name: tag?.name ?? '', color: tag?.color ?? DEFAULT_TAG_COLOR },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      const input = { name: value.name.trim(), color: value.color };
      const handlers = {
        onSuccess: () => onOpenChange(false),
        onError: (error: Error) => toast.error(error.message),
      };
      if (tag) update.mutate({ id: tag.id, input }, handlers);
      else create.mutate(input, handlers);
    },
  });

  const name = t('Fields.Tag', { count: 1 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tag ? t('Common.Update', { name }) : t('Common.Create', { name })}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => <FieldText field={field} label={t('Fields.Name')} disabled={pending} />}
          </form.Field>
          <form.Field name="color">
            {(field) => (
              <FieldText field={field} label={t('Fields.Color')} type="color" disabled={pending} />
            )}
          </form.Field>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t('Common.Cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {t('Common.Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
