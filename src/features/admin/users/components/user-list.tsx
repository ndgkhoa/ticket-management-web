import { useTranslation } from 'react-i18next';
import { Empty, Space, Table } from 'antd';
import type { TableProps } from 'antd';

import { formatDate } from '~/utils';
import { ErrorPage } from '~/components/errors';
import { useQueryParams } from '~/hooks/use-query-params';
import { useUserList } from '~/features/admin/users/hooks/queries/use-user-list';
import type { User, UserSearchParams } from '~/features/admin/users/types/User';
import UpdateUserModal from '~/features/admin/users/components/update-user-modal';
import DeleteUserConfirmation from '~/features/admin/users/components/delete-user-confirmation';
import UserRolesModal from '~/features/admin/users/components/user-roles-modal';

const UserList = (props: TableProps<User> & { searchParams?: UserSearchParams }) => {
  const { t } = useTranslation();
  const { searchParams, ...tableProps } = props;
  const userQuery = useUserList(searchParams);

  const { queryParams, setQueryParams } = useQueryParams();

  const handleDeleteSuccess = () => {
    const currentPage = queryParams.page || 1;
    const pageSize = queryParams.pageSize || 10;

    const totalRecordsAfterDelete = (userQuery.data?.data?.TotalRecord ?? 1) - 1;
    const totalPagesAfterDelete = Math.ceil(totalRecordsAfterDelete / pageSize);

    const newPage =
      currentPage > totalPagesAfterDelete && currentPage > 1 ? currentPage - 1 : currentPage;
    setQueryParams({ page: newPage, pageSize });
  };

  const columns: TableProps<User>['columns'] = [
    {
      title: '-',
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (value, record) => {
        return (
          <Space>
            <UpdateUserModal user={record} />
            <DeleteUserConfirmation userId={value} onDeleteSuccess={handleDeleteSuccess} />
          </Space>
        );
      },
      width: 100,
    },
    {
      title: t('Fields.Index'),
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (_, __, index) => {
        const currentPage = props.searchParams?.pageIndex || 1;
        const pageSize = props.searchParams?.pageSize || 10;
        return (currentPage - 1) * pageSize + index + 1;
      },
      width: 100,
    },
    {
      title: t('Login.UserName'),
      dataIndex: 'UserName',
      key: 'UserName',
      width: 200,
    },
    {
      title: t('Fields.FullName'),
      dataIndex: 'FullName',
      key: 'FullName',
      width: 200,
    },
    {
      title: t('Login.Email'),
      dataIndex: 'Email',
      key: 'Email',
      width: 200,
    },
    {
      title: t('Login.PhoneNumber'),
      dataIndex: 'PhoneNumber',
      key: 'PhoneNumber',
      width: 200,
    },
    {
      title: t('Fields.Roles'),
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (_, record) => {
        return <UserRolesModal user={record} />;
      },
      width: 100,
    },
    {
      title: t('Fields.CreatedDate'),
      dataIndex: 'CreatedDate',
      key: 'CreatedDate',
      width: 200,
      align: 'center' as const,
      render: (value) => formatDate(value),
    },
  ];

  if (userQuery.isError) {
    return <ErrorPage subTitle={userQuery.error.message} />;
  }

  return (
    <Table
      bordered
      {...tableProps}
      rowKey="Id"
      loading={userQuery.isPending}
      dataSource={userQuery.data?.data.Data}
      columns={columns}
      scroll={{ x: 1300 }}
      pagination={{
        total: userQuery.data?.data.TotalRecord,
        current: props?.searchParams?.pageIndex,
        pageSize: props.searchParams?.pageSize,
        ...props.pagination,
      }}
      locale={{
        emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Common.NoData')} />,
      }}
    />
  );
};

export default UserList;
