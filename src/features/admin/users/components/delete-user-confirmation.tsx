import { useTranslation } from 'react-i18next';
import { App, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

import { Notification } from '~/utils';
import { Popconfirm, Tooltip } from '~/components/ui';
import { useDeleteUser } from '~/features/admin/users/hooks/mutations/use-delete-user';
import type { User } from '~/features/admin/users/types/User';

const DeleteUserConfirmation = ({
  userId,
  onDeleteSuccess,
}: {
  userId?: User['Id'];
  onDeleteSuccess?: () => void;
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const deleteMutation = useDeleteUser();

  const onDeleteClick = async (id?: User['Id']) => {
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
      title={t('Common.Delete', { name: t('Fields.User', { count: 1 }) })}
      description={t('Common.ConfirmDelete', { name: t('Fields.User', { count: 1 }) })}
      onConfirm={() => onDeleteClick(userId)}
    >
      <Tooltip title={t('Common.Delete', { name: t('Fields.User', { count: 1 }) })}>
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

export default DeleteUserConfirmation;
