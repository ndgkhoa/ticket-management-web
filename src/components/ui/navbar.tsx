import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex, Layout, Select, theme as AntTheme } from 'antd';
import type { MenuProps } from 'antd';

import { useAuthStore } from '~/stores/auth';

export const Navbar = memo(() => {
  const { t, i18n } = useTranslation();
  const signOut = useAuthStore((state) => state.signOut);
  const {
    token: { colorBgContainer },
  } = AntTheme.useToken();

  const items: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('Common.Logout'),
      onClick: () => {
        void signOut();
      },
    },
  ];

  return (
    <Layout.Header style={{ display: 'flex', padding: '0 16px', background: colorBgContainer }}>
      <Flex align="center" justify="end" gap="middle" style={{ width: '100%' }}>
        {/* Controlled by i18next: an uncontrolled `defaultValue` would show "en"
            after a reload even when the restored language is Vietnamese.
            `resolvedLanguage` is the language actually in effect after fallback. */}
        <Select
          value={i18n.resolvedLanguage}
          onChange={(value) => i18n.changeLanguage(value)}
          options={[
            { value: 'vi', label: t('Common.Vi') },
            { value: 'en', label: t('Common.En') },
          ]}
        />
        <Dropdown menu={{ items }} trigger={['hover']}>
          <Button shape="circle" icon={<UserOutlined />} />
        </Dropdown>
      </Flex>
    </Layout.Header>
  );
});
