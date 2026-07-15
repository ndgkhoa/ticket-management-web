import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';

import { Modal, Tooltip } from '~/components/ui';
import RoleForm from '~/features/admin/roles/components/role-form';
import type { Role } from '~/features/admin/roles/types/Role';

const UpdateRoleModal = ({ role }: { role?: Role }) => {
  const { t } = useTranslation();

  if (!role) return null;

  const modalName = `update-role-modal-${role?.Id}`;

  return (
    <Modal>
      <Modal.Opens opens={modalName}>
        <Tooltip title={t('Common.Update', { name: t('Fields.Role', { count: 1 }) })}>
          <Button
            size="small"
            type="text"
            icon={<EditOutlined style={{ color: '#eab308', fontSize: 18 }} />}
          />
        </Tooltip>
      </Modal.Opens>
      <Modal.Window
        name={modalName}
        modalProps={{ title: t('Common.Update', { name: t('Fields.Role', { count: 1 }) }) }}
      >
        <RoleForm role={role} />
      </Modal.Window>
    </Modal>
  );
};

export default UpdateRoleModal;
