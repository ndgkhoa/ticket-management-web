import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
} from '~/components/ui';
import { useRoleList } from '~/features/admin/roles/api/role-queries';
import { useToggleUserRole, useUserRoles } from '~/features/admin/users/api/user-role-queries';
import type { User } from '~/features/admin/users/schemas/user-schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
};

export function UserRolesDialog({ open, onOpenChange, user }: Props) {
  const { t } = useTranslation();
  const rolesQuery = useRoleList();
  const userRolesQuery = useUserRoles(user.id);
  const toggle = useToggleUserRole(user.id);

  const assigned = new Set(userRolesQuery.data ?? []);
  const loading = rolesQuery.isPending || userRolesQuery.isPending;
  const busy = toggle.isPending || userRolesQuery.isFetching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user.fullName ?? user.email}</DialogTitle>
          <DialogDescription>{t('Fields.UserRoles')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm">{t('Common.Loading')}</p>
        ) : (
          <ul className="space-y-3">
            {(rolesQuery.data ?? []).map((role) => (
              <li key={role.id} className="flex items-start gap-3">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={assigned.has(role.id)}
                  disabled={busy}
                  onCheckedChange={(value) =>
                    toggle.mutate(
                      { roleId: role.id, checked: value === true },
                      { onError: (error) => toast.error(error.message) }
                    )
                  }
                />
                <Label htmlFor={`role-${role.id}`} className="grid gap-0.5">
                  <span className="text-sm font-medium">{role.name}</span>
                  {role.description && (
                    <span className="text-muted-foreground text-xs font-normal">
                      {role.description}
                    </span>
                  )}
                </Label>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
