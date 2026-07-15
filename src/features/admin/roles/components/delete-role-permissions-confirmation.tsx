import { useTranslation } from 'react-i18next';
import { App, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';

import { Notification } from '~/utils';
import { Popconfirm, Tooltip } from '~/components/ui';
import type { RolePermission } from '~/features/admin/roles/types/Role';
import { queryClient } from '~/lib/query-client';
import { roleApi } from '~/features/admin/roles/api/role-api';

const DeleteRolePermissionsConfirmation = ({
  rolePermissionId,
}: {
  rolePermissionId?: RolePermission['Id'];
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const deleteMutation = useMutation({
    mutationFn: async (ids: RolePermission['Id'][]) => {
      return await roleApi.deletePermissions(ids);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['role', 'permissions'] });
      message.success(Notification.success(response).message);
    },
    onError: (error) => {
      message.error(Notification.error(error).message);
    },
  });

  const onDeleteClick = async (ids?: RolePermission['Id'][]) => {
    if (!ids || ids.length === 0) return;
    deleteMutation.mutate(ids);
  };

  return (
    <Popconfirm
      title={t('Common.Delete', { name: t('Fields.Permission', { count: 1 }) })}
      description={t('Common.ConfirmDelete', { name: t('Fields.Permission', { count: 1 }) })}
      onConfirm={() => onDeleteClick([rolePermissionId!])}
    >
      <Tooltip title={t('Common.Delete', { name: t('Fields.Permission', { count: 1 }) })}>
        <Button
          danger
          size="small"
          type="text"
          icon={<DeleteOutlined style={{ fontSize: 18 }} />}
        />
      </Tooltip>
    </Popconfirm>
  );
};

export default DeleteRolePermissionsConfirmation;
