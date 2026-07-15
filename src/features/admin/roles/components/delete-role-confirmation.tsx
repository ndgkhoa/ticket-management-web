import { useTranslation } from 'react-i18next';
import { App, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

import { Notification } from '~/utils';
import { Popconfirm, Tooltip } from '~/components/ui';
import { useDeleteRole } from '~/features/admin/roles/hooks/mutations/use-delete-role';
import type { Role } from '~/features/admin/roles/types/Role';

const DeleteRoleConfirmation = ({
  roleId,
  onDeleteSuccess,
}: {
  roleId?: Role['Id'];
  onDeleteSuccess?: () => void;
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const deleteMutation = useDeleteRole();

  const onDeleteClick = async (id?: Role['Id']) => {
    if (!id) return;
    try {
      const response = await deleteMutation.mutateAsync(id);
      deleteMutation.invalidate();
      message.success(Notification.success(response).message);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      message.error(Notification.error(error).message);
    }
  };

  return (
    <Popconfirm
      title={t('Common.Delete', { name: t('Fields.Role', { count: 1 }) })}
      description={t('Common.ConfirmDelete', { name: t('Fields.Role', { count: 1 }) })}
      onConfirm={() => onDeleteClick(roleId)}
    >
      <Tooltip title={t('Common.Delete', { name: t('Fields.Role', { count: 1 }) })}>
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

export default DeleteRoleConfirmation;
