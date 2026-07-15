import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Menu, Layout, Flex } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';

import viagsLogoFull from '/images/viags-logo-full-2.png';
import viagsLogo from '/images/viags-logo.png';

export const Sidebar = memo(() => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const parentKey = `/${pathname.split('/')[1]}`;

  const [openKeys, setOpenKeys] = useState<string[]>([parentKey]);

  const onClick: MenuProps['onClick'] = (e) => navigate(e.key);

  const items: MenuProps['items'] = [
    { key: '/', icon: <HomeOutlined />, label: t('Sidebar.Home') },
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
        <img src={viagsLogo} alt={t('App.Name')} className="h-10" />
      ) : (
        <img src={viagsLogoFull} alt={t('App.Name')} className="h-11" />
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
