import { useMemo } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';

import { FieldSelect, FieldText, FieldTextarea } from '~/components/form';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';
import {
  useCategoryCreate,
  useCategoryUpdate,
} from '~/features/admin/categories/api/category-queries';
import { useTeamList } from '~/features/admin/teams/api/team-queries';
import type { Category } from '~/features/admin/categories/schemas/category-schema';

const NO_TEAM = '';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
};

export function CategoryFormDialog({ open, onOpenChange, category }: Props) {
  const { t } = useTranslation();
  const create = useCategoryCreate();
  const update = useCategoryUpdate();
  const { data: teams = [] } = useTeamList();
  const pending = create.isPending || update.isPending;

  const teamOptions = useMemo(
    () => [
      { label: '—', value: NO_TEAM },
      ...teams.map((team) => ({ label: team.name, value: team.id })),
    ],
    [teams]
  );

  const schema = z.object({
    name: z.string().min(1, t('Validation.Required')),
    description: z.string(),
    defaultTeamId: z.string(),
  });

  const form = useForm({
    defaultValues: {
      name: category?.name ?? '',
      description: category?.description ?? '',
      defaultTeamId: category?.defaultTeamId ?? NO_TEAM,
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      const input = {
        name: value.name.trim(),
        description: value.description.trim() || null,
        default_team_id: value.defaultTeamId || null,
      };
      const handlers = {
        onSuccess: () => onOpenChange(false),
        onError: (error: Error) => toast.error(error.message),
      };
      if (category) update.mutate({ id: category.id, input }, handlers);
      else create.mutate(input, handlers);
    },
  });

  const name = t('Fields.Category', { count: 1 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? t('Common.Update', { name }) : t('Common.Create', { name })}
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
          <form.Field name="defaultTeamId">
            {(field) => (
              <FieldSelect
                field={field}
                label={t('Fields.DefaultTeam')}
                options={teamOptions}
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
