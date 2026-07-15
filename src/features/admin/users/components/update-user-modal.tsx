import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { Modal, Tooltip } from '~/components/ui';
import UserForm from '~/features/admin/users/components/user-form';
import type { User } from '~/features/admin/users/types/User';

const UpdateUserModal = ({ user }: { user?: User }) => {
  const { t } = useTranslation();

  if (!user) return null;

  const modalName = `update-user-modal-${user?.Id}`;

  return (
    <Modal>
      <Modal.Opens opens={modalName}>
        <Tooltip title={t('Common.Update', { name: t('Fields.User', { count: 1 }) })}>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined style={{ color: '#eab308', fontSize: 18 }} />}
          />
        </Tooltip>
      </Modal.Opens>
      <Modal.Window
        name={modalName}
        modalProps={{
          title: t('Common.Update', { name: t('Fields.User', { count: 1 }) }),
          width: '900px',
        }}
      >
        <UserForm user={user} />
      </Modal.Window>
    </Modal>
  );
};

export default UpdateUserModal;
