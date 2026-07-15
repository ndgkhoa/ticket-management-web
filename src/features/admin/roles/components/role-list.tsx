import { useTranslation } from 'react-i18next';
import { Empty, Space, Table } from 'antd';
import type { TableProps } from 'antd';

import { formatDate } from '~/utils';
import { ErrorPage } from '~/components/errors';
import { useQueryParams } from '~/hooks/use-query-params';
import { useRoleList } from '~/features/admin/roles/hooks/queries/use-role-list';
import type { Role, RoleSearchParams } from '~/features/admin/roles/types/Role';
import UpdateRoleModal from '~/features/admin/roles/components/update-role-modal';
import DeleteRoleConfirmation from '~/features/admin/roles/components/delete-role-confirmation';
import RolePermissionsModal from '~/features/admin/roles/components/role-permissions-modal';

const RoleList = (props: TableProps<Role> & { searchParams?: RoleSearchParams }) => {
  const { t } = useTranslation();
  const { searchParams, ...tableProps } = props;
  const roleQuery = useRoleList(searchParams);

  const { queryParams, setQueryParams } = useQueryParams();

  const handleDeleteSuccess = () => {
    const currentPage = queryParams.page || 1;
    const pageSize = queryParams.pageSize || 10;

    const totalRecordsAfterDelete = (roleQuery.data?.data?.TotalRecord ?? 1) - 1;
    const totalPagesAfterDelete = Math.ceil(totalRecordsAfterDelete / pageSize);

    const newPage =
      currentPage > totalPagesAfterDelete && currentPage > 1 ? currentPage - 1 : currentPage;
    setQueryParams({ page: newPage, pageSize });
  };

  const columns: TableProps<Role>['columns'] = [
    {
      title: '-',
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (value, record) => {
        return (
          <Space>
            <UpdateRoleModal role={record} />
            <DeleteRoleConfirmation roleId={value} onDeleteSuccess={handleDeleteSuccess} />
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
      title: t('Fields.RoleName'),
      dataIndex: 'RoleName',
      key: 'RoleName',
      width: 200,
    },
    {
      title: t('Fields.Description'),
      dataIndex: 'Description',
      key: 'Description',
      width: 200,
    },
    {
      title: t('Fields.Permissions'),
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (_, record) => {
        return <RolePermissionsModal role={record} />;
      },
      width: 100,
    },
    {
      title: t('Fields.CreatedDate'),
      dataIndex: 'CreatedDate',
      key: 'CreatedDate',
      width: 200,
      align: 'center' as const,
      render: (value) => {
        return formatDate(value);
      },
    },
  ];

  if (roleQuery.isError) {
    return <ErrorPage subTitle={roleQuery.error.message} />;
  }

  return (
    <Table
      bordered
      {...tableProps}
      rowKey="Id"
      loading={roleQuery.isPending}
      dataSource={roleQuery.data?.data.Data}
      columns={columns}
      scroll={{ x: 900 }}
      pagination={{
        total: roleQuery.data?.data.TotalRecord,
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

export default RoleList;
