import { useTranslation } from 'react-i18next';
import { Empty, Table, Tag } from 'antd';
import type { TableProps } from 'antd';

import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { useRoleList } from '~/features/admin/roles/api/role-queries';
import type { Role } from '~/features/admin/roles/schemas/role-schema';

/**
 * Read-only role list on the Supabase data layer. The role-permission matrix editor
 * and CRUD arrive with the design-system rebuild; this proves the query and RLS.
 */
const Roles = () => {
  const { t } = useTranslation();
  const roleQuery = useRoleList();

  const columns: TableProps<Role>['columns'] = [
    {
      title: t('Fields.RoleName'),
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (name: string, role) =>
        role.isSystem ? (
          <>
            {name} <Tag>{t('Common.System')}</Tag>
          </>
        ) : (
          name
        ),
    },
    {
      title: t('Fields.Description'),
      dataIndex: 'description',
      key: 'description',
    },
  ];

  if (roleQuery.isError) {
    return <ErrorPage subTitle={roleQuery.error.message} />;
  }

  return (
    <Container title={t('Common.List', { name: t('Fields.Role_other') })}>
      <Table
        bordered
        rowKey="id"
        loading={roleQuery.isPending}
        dataSource={roleQuery.data}
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

export default Roles;
