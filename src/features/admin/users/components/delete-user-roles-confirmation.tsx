import { useTranslation } from 'react-i18next';
import { App, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';

import { Notification } from '~/utils';
import { Popconfirm, Tooltip } from '~/components/ui';
import type { UserRole } from '~/features/admin/users/types/User';
import { queryClient } from '~/lib/query-client';
import { userApi } from '~/features/admin/users/api/user-api';

const DeleteUserRolesConfirmation = ({ userRoleId }: { userRoleId?: UserRole['Id'] }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const deleteMutation = useMutation({
    mutationFn: async (ids: UserRole['Id'][]) => {
      return await userApi.deleteRoles(ids);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['user', 'roles'] });
      message.success(Notification.success(response).message);
    },
    onError: (error) => {
      message.error(Notification.error(error).message);
    },
  });

  const onDeleteClick = async (ids?: UserRole['Id'][]) => {
    if (!ids || ids.length === 0) return;
    deleteMutation.mutate(ids);
  };

  return (
    <Popconfirm
      title={t('Common.Delete', { name: t('Fields.Role', { count: 1 }) })}
      description={t('Common.ConfirmDelete', { name: t('Fields.Role', { count: 1 }) })}
      onConfirm={() => onDeleteClick([userRoleId!])}
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

export default DeleteUserRolesConfirmation;
