import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { Modal, Tooltip } from '~/components/ui';
import PermissionForm from '~/features/admin/permissions/components/permission-form';
import type { Permission } from '~/features/admin/permissions/types/Permission';

const UpdatePermissionModal = ({ permission }: { permission?: Permission }) => {
  const { t } = useTranslation();

  if (!permission) return null;

  const modalName = `update-permission-modal-${permission?.Id}`;

  return (
    <Modal>
      <Modal.Opens opens={modalName}>
        <Tooltip title={t('Common.Update', { name: t('Fields.Permission', { count: 1 }) })}>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined style={{ color: '#eab308', fontSize: 18 }} />}
          />
        </Tooltip>
      </Modal.Opens>
      <Modal.Window
        name={modalName}
        modalProps={{ title: t('Common.Update', { name: t('Fields.Permission', { count: 1 }) }) }}
      >
        <PermissionForm permission={permission} />
      </Modal.Window>
    </Modal>
  );
};

export default UpdatePermissionModal;
