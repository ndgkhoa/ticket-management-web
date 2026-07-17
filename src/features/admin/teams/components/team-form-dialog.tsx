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
import { useTeamCreate, useTeamUpdate } from '~/features/admin/teams/api/team-queries';
import type { Team } from '~/features/admin/teams/schemas/team-schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row being edited, or null/undefined to create a new one. */
  team?: Team | null;
};

/**
 * Create/edit dialog for a team. One form serves both: an absent `team` is a create,
 * a present one pre-fills for an edit. Mount it with a `key` tied to the target id so
 * the defaults reset when the edited row changes (TanStack Form reads them once).
 */
export function TeamFormDialog({ open, onOpenChange, team }: Props) {
  const { t } = useTranslation();
  const create = useTeamCreate();
  const update = useTeamUpdate();
  const pending = create.isPending || update.isPending;

  const schema = z.object({
    name: z.string().min(1, t('Validation.Required')),
    description: z.string(),
  });

  const form = useForm({
    defaultValues: { name: team?.name ?? '', description: team?.description ?? '' },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      // Empty description collapses to null — the column is nullable, and '' vs null
      // should not be two distinct "no description" states.
      const input = { name: value.name.trim(), description: value.description.trim() || null };
      const handlers = {
        onSuccess: () => onOpenChange(false),
        onError: (error: Error) => toast.error(error.message),
      };
      if (team) update.mutate({ id: team.id, input }, handlers);
      else create.mutate(input, handlers);
    },
  });

  const name = t('Fields.Team', { count: 1 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {team ? t('Common.Update', { name }) : t('Common.Create', { name })}
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
          <form.Field name="description">
            {(field) => (
              <FieldTextarea field={field} label={t('Fields.Description')} disabled={pending} />
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
