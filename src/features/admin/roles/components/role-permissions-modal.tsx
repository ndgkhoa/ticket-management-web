import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Flex, Modal, Tabs } from 'antd';
import { SecurityScanOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';

import { Tooltip } from '~/components/ui';
import type { Role } from '~/features/admin/roles/types/Role';
import UpdateRolePermissionsTab from '~/features/admin/roles/components/update-role-permissions-tab';
import CreateRolePermissionsTab from '~/features/admin/roles/components/create-role-permissions-tab';

export interface RolePermissionsTabRef {
  submit: () => void;
  reset: () => void;
}

const RolePermissionsModal = ({ role }: { role?: Role }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('1');
  const updateTabRef = useRef<RolePermissionsTabRef>(null);
  const createTabRef = useRef<RolePermissionsTabRef>(null);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    if (activeTabKey === '1') {
      updateTabRef.current?.submit();
    } else {
      const success = createTabRef.current?.submit();
      if (success) {
        setActiveTabKey('1');
      }
    }
  };

  const handleCancel = () => {
    if (activeTabKey === '1') {
      updateTabRef.current?.reset();
    } else {
      createTabRef.current?.reset();
      setActiveTabKey('1');
    }
    setIsModalOpen(false);
  };

  // Guard *after* the hooks: an early return above them would change the hook
  // order the first time `role` arrives, which React rejects outright.
  if (!role) return null;

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: t('Common.Update', { name: '' }),
      children: <UpdateRolePermissionsTab ref={updateTabRef} roleId={role.Id} />,
    },
    {
      key: '2',
      label: t('Common.Create', { name: '' }),
      children: <CreateRolePermissionsTab ref={createTabRef} roleId={role.Id} />,
    },
  ];

  return (
    <>
      <Tooltip title={t('Common.Update', { name: t('Fields.RolePermissions') })}>
        <Button
          size="small"
          type="text"
          icon={<SecurityScanOutlined style={{ color: '#3b82f6', fontSize: 18 }} />}
          onClick={showModal}
        />
      </Tooltip>
      <Modal
        title={`${t('Common.Update', { name: t('Fields.RolePermissions') })} ${role.RoleName}`}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        width={900}
        footer={
          <Flex gap="middle" align="center" justify="end">
            <Button onClick={handleCancel}>{t('Common.Cancel')}</Button>
            <Button type="primary" onClick={handleOk}>
              {t('Common.Confirm')}
            </Button>
          </Flex>
        }
      >
        <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} items={items} />
      </Modal>
    </>
  );
};

export default RolePermissionsModal;
