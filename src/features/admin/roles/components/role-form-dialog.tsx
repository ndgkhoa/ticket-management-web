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
import { useRoleCreate, useRoleUpdate } from '~/features/admin/roles/api/role-queries';
import type { Role } from '~/features/admin/roles/schemas/role-schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The role being edited, or null/undefined to create a new one. */
  role?: Role | null;
};

/**
 * Create/edit dialog for a role's name + description. The permission set is edited
 * separately in the matrix dialog — a role and its granted permissions are two different
 * writes (the `roles` row vs the `role_permissions` junction).
 */
export function RoleFormDialog({ open, onOpenChange, role }: Props) {
  const { t } = useTranslation();
  const create = useRoleCreate();
  const update = useRoleUpdate();
  const pending = create.isPending || update.isPending;

  const schema = z.object({
    name: z.string().min(1, t('Validation.Required')),
    description: z.string(),
  });

  const form = useForm({
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '' },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      const input = { name: value.name.trim(), description: value.description.trim() || null };
      const handlers = {
        onSuccess: () => onOpenChange(false),
        onError: (error: Error) => toast.error(error.message),
      };
      if (role) update.mutate({ id: role.id, input }, handlers);
      else create.mutate(input, handlers);
    },
  });

  const name = t('Fields.Role', { count: 1 });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {role ? t('Common.Update', { name }) : t('Common.Create', { name })}
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
            {(field) => <FieldText field={field} label={t('Fields.RoleName')} disabled={pending} />}
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
