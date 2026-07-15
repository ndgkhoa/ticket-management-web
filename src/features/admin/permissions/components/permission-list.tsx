import { useTranslation } from 'react-i18next';
import { Empty, Space, Table } from 'antd';
import type { TableProps } from 'antd';

import { formatDate } from '~/utils';
import { ErrorPage } from '~/components/errors';
import { useQueryParams } from '~/hooks/use-query-params';
import { usePermissionList } from '~/features/admin/permissions/hooks/queries/use-permission-list';
import type {
  Permission,
  PermissionSearchParams,
} from '~/features/admin/permissions/types/Permission';
import UpdatePermissionModal from '~/features/admin/permissions/components/update-permission-modal';
import DeletePermissionConfirmation from '~/features/admin/permissions/components/delete-permission-confirmation';

const PermissionList = (
  props: TableProps<Permission> & { searchParams?: PermissionSearchParams }
) => {
  const { t } = useTranslation();
  const { searchParams, ...tableProps } = props;
  const permissionQuery = usePermissionList(searchParams);

  const { queryParams, setQueryParams } = useQueryParams();

  const handleDeleteSuccess = () => {
    const currentPage = queryParams.page || 1;
    const pageSize = queryParams.pageSize || 10;

    const totalRecordsAfterDelete = (permissionQuery.data?.data?.TotalRecord ?? 1) - 1;
    const totalPagesAfterDelete = Math.ceil(totalRecordsAfterDelete / pageSize);

    const newPage =
      currentPage > totalPagesAfterDelete && currentPage > 1 ? currentPage - 1 : currentPage;
    setQueryParams({ page: newPage, pageSize });
  };

  const columns: TableProps<Permission>['columns'] = [
    {
      title: '-',
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (value, record) => {
        return (
          <Space>
            <UpdatePermissionModal permission={record} />
            <DeletePermissionConfirmation
              permissionId={value}
              onDeleteSuccess={handleDeleteSuccess}
            />
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
      title: t('Fields.PermissionCode'),
      dataIndex: 'PermissionCode',
      key: 'PermissionCode',
      width: 200,
    },
    {
      title: t('Fields.PermissionName'),
      dataIndex: 'PermissionName',
      key: 'PermissionName',
      width: 200,
    },
    {
      title: t('Fields.Description'),
      dataIndex: 'Description',
      key: 'Description',
      width: 200,
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

  if (permissionQuery.isError) {
    return <ErrorPage subTitle={permissionQuery.error.message} />;
  }

  return (
    <Table
      bordered
      {...tableProps}
      rowKey="Id"
      loading={permissionQuery.isPending}
      dataSource={permissionQuery.data?.data.Data}
      columns={columns}
      scroll={{ x: 1000 }}
      pagination={{
        total: permissionQuery.data?.data.TotalRecord,
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

export default PermissionList;
