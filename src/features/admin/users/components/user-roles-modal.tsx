import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Flex, Modal, Tabs } from 'antd';
import { SecurityScanOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';

import { Tooltip } from '~/components/ui';
import type { User } from '~/features/admin/users/types/User';
import CreateUserRolesTab from '~/features/admin/users/components/create-user-roles-tab';
import UpdateUserRolesTab from '~/features/admin/users/components/update-user-roles-tab';

export interface UserRolesTabRef {
  submit: () => void;
  reset: () => void;
}

const UserRolesModal = ({ user }: { user?: User }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('1');
  const updateTabRef = useRef<UserRolesTabRef>(null);
  const createTabRef = useRef<UserRolesTabRef>(null);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleOk = () => {
    if (activeTabKey === '1') {
      const success = updateTabRef.current?.submit();
      if (success) setIsModalOpen(false);
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
  // order the first time `user` arrives, which React rejects outright.
  if (!user) return null;

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: t('Common.Update', { name: '' }),
      children: <UpdateUserRolesTab ref={updateTabRef} userId={user.Id} />,
    },
    {
      key: '2',
      label: t('Common.Create', { name: '' }),
      children: <CreateUserRolesTab ref={createTabRef} userId={user.Id} />,
    },
  ];

  return (
    <>
      <Tooltip title={t('Common.Update', { name: t('Fields.UserRoles') })}>
        <Button
          size="small"
          type="text"
          icon={<SecurityScanOutlined style={{ color: '#3b82f6', fontSize: 18 }} />}
          onClick={showModal}
        />
      </Tooltip>
      <Modal
        title={`${t('Common.Update', { name: t('Fields.UserRoles') })} ${user.UserName}`}
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

export default UserRolesModal;
