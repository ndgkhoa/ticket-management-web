import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContainerOutlined, HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Menu, Layout, Flex } from 'antd';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import type { MenuProps } from 'antd';

import logoFull from '/images/logo-full.svg';
import logoMark from '/images/logo-mark.svg';

/**
 * The menu keys, which are also route paths. antd's `onClick` hands back a plain
 * `string` key; this union lets it navigate through the typed router. The whole
 * sidebar is replaced by the design-system nav in a later phase — until then the cast
 * bridges antd's string-keyed menu to type-safe navigation.
 */
type NavKey = '/' | '/tickets' | '/admin/permissions' | '/admin/roles' | '/admin/users';

export const Sidebar = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const parentKey = `/${pathname.split('/')[1]}`;

  const [openKeys, setOpenKeys] = useState<string[]>([parentKey]);

  const onClick: MenuProps['onClick'] = (e) => {
    void navigate({ to: e.key as NavKey });
  };

  const items: MenuProps['items'] = [
    { key: '/', icon: <HomeOutlined />, label: t('Sidebar.Home') },
    { key: '/tickets', icon: <ContainerOutlined />, label: t('Fields.Ticket_other') },
    {
      key: '/admin',
      icon: <SafetyCertificateOutlined />,
      label: t('Sidebar.Admin'),
      children: [
        { key: '/admin/permissions', label: t('Fields.Permissions') },
        { key: '/admin/roles', label: t('Fields.Roles') },
        { key: '/admin/users', label: t('Fields.Users') },
      ],
    },
  ];

  // The logo is the only content of this link, so its alt text is what a screen
  // reader announces for "go home" — it must name the app, not be empty.
  const renderedLogo = (
    <Link to="/" className="flex h-16 items-center justify-center">
      {collapsed ? (
        <img src={logoMark} alt={t('App.Name')} className="h-10" />
      ) : (
        <img src={logoFull} alt={t('App.Name')} className="h-11" />
      )}
    </Link>
  );

  return (
    <Layout.Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={280}>
      <Flex align="center" justify="center" className="h-16">
        {renderedLogo}
      </Flex>
      <Menu
        theme="dark"
        onClick={onClick}
        mode="inline"
        items={items}
        openKeys={openKeys}
        selectedKeys={[pathname]}
        onOpenChange={(keys) => setOpenKeys(keys)}
        className={`h-[calc(100vh-110px)] overflow-y-auto transition-all duration-300 ${
          collapsed ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      />
    </Layout.Sider>
  );
});
