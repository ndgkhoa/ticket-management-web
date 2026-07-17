import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';

import { Constants } from '~/lib/database.types';
import { FieldSelect, FieldText } from '~/components/form';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {
  useSlaPolicyCreate,
  useSlaPolicyUpdate,
} from '~/features/admin/sla-policies/api/sla-policy-queries';
import type { SlaPolicy } from '~/features/admin/sla-policies/schemas/sla-policy-schema';

/** Priority options for the select, derived from the generated enum so a new priority
 *  value added in Postgres shows up here without a hand-maintained list. */
const PRIORITY_OPTIONS = Constants.public.Enums.ticket_priority.map((priority) => ({
  value: priority,
  label: priority.charAt(0).toUpperCase() + priority.slice(1),
}));

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited, or null/undefined to create a new one. */
  policy?: SlaPolicy | null;
};

/**
 * Create/edit dialog for an SLA policy. One form serves both: an absent `policy` is a
 * create, a present one pre-fills for an edit. Mount it with a `key` tied to the target
 * id so the defaults reset when the edited row changes (TanStack Form reads them once).
 *
 * The two minute fields are kept as strings in form state — native number inputs hand
 * back strings, and coercing to number happens once at validation/submit rather than
 * on every keystroke.
 */
export function SlaPolicyFormDialog({ open, onOpenChange, policy }: Props) {
  const { t } = useTranslation();
  const create = useSlaPolicyCreate();
  const update = useSlaPolicyUpdate();
  const pending = create.isPending || update.isPending;

  // Native number inputs hand back strings — parse and range-check here rather than on
  // every keystroke, keeping the field itself a plain string until submit.
  const positiveMinsSchema = z
    .string()
    .min(1, t('Validation.Required'))
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value) && value > 0, t('Validation.PositiveInteger'));

  const schema = z.object({
    name: z.string().min(1, t('Validation.Required')),
    priority: z.enum(Constants.public.Enums.ticket_priority),
    first_response_mins: positiveMinsSchema,
    resolution_mins: positiveMinsSchema,
  });

  const form = useForm({
    defaultValues: {
      name: policy?.name ?? '',
      priority: policy?.priority ?? Constants.public.Enums.ticket_priority[0],
      first_response_mins: String(policy?.first_response_mins ?? ''),
      resolution_mins: String(policy?.resolution_mins ?? ''),
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      const input = {
        name: value.name.trim(),
        priority: value.priority,
        first_response_mins: Number(value.first_response_mins),
        resolution_mins: Number(value.resolution_mins),
      };
      const handlers = {
        onSuccess: () => onOpenChange(false),
        onError: (error: Error) => toast.error(error.message),
      };
      if (policy) update.mutate({ id: policy.id, input }, handlers);
      else create.mutate(input, handlers);
    },
  });

  const name = t('Fields.SlaPolicy', { count: 1 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {policy ? t('Common.Update', { name }) : t('Common.Create', { name })}
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
          <form.Field name="priority">
            {(field) => (
              <FieldSelect
                field={field}
                label={t('Fields.Priority')}
                options={PRIORITY_OPTIONS}
                disabled={pending}
              />
            )}
          </form.Field>
          <form.Field name="first_response_mins">
            {(field) => (
              <FieldText
                field={field}
                label={t('Fields.FirstResponseMins')}
                type="number"
                disabled={pending}
              />
            )}
          </form.Field>
          <form.Field name="resolution_mins">
            {(field) => (
              <FieldText
                field={field}
                label={t('Fields.ResolutionMins')}
                type="number"
                disabled={pending}
              />
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
