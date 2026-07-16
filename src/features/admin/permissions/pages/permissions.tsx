import { useTranslation } from 'react-i18next';
import { Empty, Table } from 'antd';
import type { TableProps } from 'antd';

import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { usePermissionList } from '~/features/admin/permissions/api/permission-queries';
import type { Permission } from '~/features/admin/permissions/schemas/permission-schema';

/**
 * Read-only permission catalogue.
 *
 * A deliberately plain table on the new Supabase data layer — enough to prove the
 * layer end to end, not the finished screen. Create/edit/delete, search and the
 * shared DataTable arrive with the design-system rebuild; this proves the query, the
 * schema and RLS work against a real signed-in user first.
 */
const Permissions = () => {
  const { t } = useTranslation();
  const permissionQuery = usePermissionList();

  const columns: TableProps<Permission>['columns'] = [
    {
      title: t('Fields.PermissionCode'),
      dataIndex: 'code',
      key: 'code',
      width: 260,
    },
    {
      title: t('Fields.Description'),
      dataIndex: 'description',
      key: 'description',
    },
  ];

  if (permissionQuery.isError) {
    return <ErrorPage subTitle={permissionQuery.error.message} />;
  }

  return (
    <Container title={t('Common.List', { name: t('Fields.Permission', { count: 2 }) })}>
      <Table
        bordered
        rowKey="id"
        loading={permissionQuery.isPending}
        dataSource={permissionQuery.data}
        columns={columns}
        pagination={false}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Common.NoData')} />
          ),
        }}
      />
    </Container>
  );
};

export default Permissions;
