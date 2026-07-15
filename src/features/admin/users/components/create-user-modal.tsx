import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { Modal, Tooltip } from '~/components/ui';
import UserForm from '~/features/admin/users/components/user-form';

const CreateUserModal = () => {
  const { t } = useTranslation();

  return (
    <Modal>
      <Modal.Opens opens="create-user-modal">
        <Tooltip title={t('Common.Create', { name: t('Fields.User', { count: 1 }) })}>
          <Button size="large" type="primary" icon={<PlusOutlined />} />
        </Tooltip>
      </Modal.Opens>
      <Modal.Window
        name="create-user-modal"
        modalProps={{
          title: t('Common.Create', { name: t('Fields.User', { count: 1 }) }),
          width: '900px',
        }}
      >
        <UserForm />
      </Modal.Window>
    </Modal>
  );
};

export default CreateUserModal;
