import { useLocation, Link } from '@tanstack/react-router';
import { Breadcrumb as AntBreadcrumb } from 'antd';
import { HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

// This breadcrumb derives its links from the current path and is replaced by the
// design-system phase. Until then the derived string is cast to a router path so the
// typed `Link` accepts it — the value is always a real, currently-navigable route.
type RoutePath = '/';

const specialSegments = [{ name: 'admin', icon: <SafetyCertificateOutlined /> }];

export const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  const items = [
    {
      title: (
        <Link to="/">
          <HomeOutlined />
        </Link>
      ),
    },
    ...pathnames.map((value, index) => {
      let to = `/${pathnames.slice(0, index + 1).join('/')}`;
      const special = specialSegments.find((s) => s.name === value);
      if (special) {
        to = '/';
      }

      const label = special ? special.icon : value;

      return {
        title: index === pathnames.length - 1 ? label : <Link to={to as RoutePath}>{label}</Link>,
      };
    }),
  ];

  return <AntBreadcrumb style={{ margin: '16px 0' }} items={items} />;
};
