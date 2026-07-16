import { useTranslation } from 'react-i18next';
import { Avatar, Empty, Table } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { useUserList } from '~/features/admin/users/api/user-queries';
import type { User } from '~/features/admin/users/schemas/user-schema';

/**
 * Read-only user list on the Supabase data layer. Role assignment, invites and the
 * server-side paginated DataTable arrive with the design-system rebuild; this proves
 * the profiles query and RLS work for a signed-in admin.
 */
const Users = () => {
  const { t } = useTranslation();
  const userQuery = useUserList();

  const columns: TableProps<User>['columns'] = [
    {
      title: t('Fields.FullName'),
      dataIndex: 'fullName',
      key: 'fullName',
      width: 320,
      render: (fullName: string | null, user) => (
        <span className="inline-flex items-center gap-2">
          <Avatar size="small" src={user.avatarUrl} icon={<UserOutlined />} />
          {fullName ?? '—'}
        </span>
      ),
    },
    {
      title: t('Fields.Email'),
      dataIndex: 'email',
      key: 'email',
    },
  ];

  if (userQuery.isError) {
    return <ErrorPage subTitle={userQuery.error.message} />;
  }

  return (
    <Container title={t('Common.List', { name: t('Fields.User_other') })}>
      <Table
        bordered
        rowKey="id"
        loading={userQuery.isPending}
        dataSource={userQuery.data}
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

export default Users;
