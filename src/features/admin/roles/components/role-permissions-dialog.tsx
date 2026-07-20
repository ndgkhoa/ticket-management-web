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
import { usePermissionList } from '~/features/admin/permissions/api/permission-queries';
import {
  useRolePermissions,
  useToggleRolePermission,
} from '~/features/admin/roles/api/role-permission-queries';
import type { Role } from '~/features/admin/roles/schemas/role-schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
};

export function RolePermissionsDialog({ open, onOpenChange, role }: Props) {
  const { t } = useTranslation();
  const permissionsQuery = usePermissionList();
  const assignedQuery = useRolePermissions(role.id);
  const toggle = useToggleRolePermission(role.id);

  const assigned = new Set(assignedQuery.data ?? []);
  const loading = permissionsQuery.isPending || assignedQuery.isPending;
  const busy = toggle.isPending || assignedQuery.isFetching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role.name}</DialogTitle>
          <DialogDescription>{t('Fields.RolePermissions')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm">{t('Common.Loading')}</p>
        ) : (
          <ul className="space-y-3">
            {(permissionsQuery.data ?? []).map((permission) => (
              <li key={permission.id} className="flex items-start gap-3">
                <Checkbox
                  id={`perm-${permission.id}`}
                  checked={assigned.has(permission.id)}
                  disabled={busy}
                  onCheckedChange={(value) =>
                    toggle.mutate(
                      { permissionId: permission.id, checked: value === true },
                      { onError: (error) => toast.error(error.message) }
                    )
                  }
                />
                <Label htmlFor={`perm-${permission.id}`} className="grid gap-0.5">
                  <span className="font-mono text-sm">{permission.code}</span>
                  {permission.description && (
                    <span className="text-muted-foreground text-xs font-normal">
                      {permission.description}
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
