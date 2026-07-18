import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';

import { FieldText, FieldTextarea } from '~/components/form';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';
import {
  useCannedResponseCreate,
  useCannedResponseUpdate,
} from '~/features/admin/canned-responses/api/canned-response-queries';
import type { CannedResponse } from '~/features/admin/canned-responses/schemas/canned-response-schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited, or null/undefined to create a new one. */
  cannedResponse?: CannedResponse | null;
};

/**
 * Create/edit dialog for a canned response. One form serves both: an absent
 * `cannedResponse` is a create, a present one pre-fills for an edit. Mount with a
 * `key` tied to the target id so the defaults reset when the edited row changes
 * (TanStack Form reads them once) — mirrors `category-form-dialog.tsx`.
 */
export function CannedResponseFormDialog({ open, onOpenChange, cannedResponse }: Props) {
  const { t } = useTranslation();
  const create = useCannedResponseCreate();
  const update = useCannedResponseUpdate();
  const pending = create.isPending || update.isPending;

  const schema = z.object({
    title: z.string().min(1, t('Validation.Required')),
    body: z.string().min(1, t('Validation.Required')),
  });

  const form = useForm({
    defaultValues: { title: cannedResponse?.title ?? '', body: cannedResponse?.body ?? '' },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      const input = { title: value.title.trim(), body: value.body.trim() };
      const handlers = {
        onSuccess: () => onOpenChange(false),
        onError: (error: Error) => toast.error(error.message),
      };
      if (cannedResponse) update.mutate({ id: cannedResponse.id, input }, handlers);
      else create.mutate(input, handlers);
    },
  });

  const name = t('Fields.CannedResponse', { count: 1 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cannedResponse ? t('Common.Update', { name }) : t('Common.Create', { name })}
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
          <form.Field name="title">
            {(field) => <FieldText field={field} label={t('Fields.Title')} disabled={pending} />}
          </form.Field>
          <form.Field name="body">
            {(field) => (
              <FieldTextarea field={field} label={t('Fields.Body')} rows={6} disabled={pending} />
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
