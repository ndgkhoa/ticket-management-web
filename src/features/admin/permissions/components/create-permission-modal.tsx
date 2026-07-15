import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { Modal, Tooltip } from '~/components/ui';
import PermissionForm from '~/features/admin/permissions/components/permission-form';

const CreatePermissonModal = () => {
  const { t } = useTranslation();

  return (
    <Modal>
      <Modal.Opens opens="create-permission-modal">
        <Tooltip title={t('Common.Create', { name: t('Fields.Permission', { count: 1 }) })}>
          <Button size="large" type="primary" icon={<PlusOutlined />} />
        </Tooltip>
      </Modal.Opens>
      <Modal.Window
        name="create-permission-modal"
        modalProps={{ title: t('Common.Create', { name: t('Fields.Permission', { count: 1 }) }) }}
      >
        <PermissionForm />
      </Modal.Window>
    </Modal>
  );
};

export default CreatePermissonModal;
