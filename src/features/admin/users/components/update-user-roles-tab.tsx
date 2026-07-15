import { forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { TableProps } from 'antd';

import { userApi } from '~/features/admin/users/api/user-api';
import type { User, UserRole } from '~/features/admin/users/types/User';
import type { UserRolesTabRef } from '~/features/admin/users/components/user-roles-modal';
import DeleteUserRolesConfirmation from '~/features/admin/users/components/delete-user-roles-confirmation';

interface Props {
  userId?: User['Id'];
}

const UpdateUserRolesTab = forwardRef<UserRolesTabRef, Props>((props, ref) => {
  const { t } = useTranslation();

  const userRolesQuery = useQuery({
    queryKey: ['user', 'roles', props.userId],
    queryFn: () => userApi.getRoles(props.userId!),
    enabled: !!props.userId,
  });

  const handleSubmit = () => {
    return true;
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    reset: () => {},
  }));

  const columns: TableProps<UserRole>['columns'] = [
    {
      title: '-',
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (value) => {
        return <DeleteUserRolesConfirmation userRoleId={value} />;
      },
      width: 100,
    },
    { title: t('Fields.RoleName'), dataIndex: 'RoleName' },
    { title: t('Fields.Description'), dataIndex: 'Description' },
  ];

  return (
    <Table<UserRole>
      bordered
      rowKey="Id"
      columns={columns}
      loading={userRolesQuery.isPending}
      dataSource={userRolesQuery.data?.data.Data}
      pagination={{
        pageSize: 5,
      }}
    />
  );
});

export default UpdateUserRolesTab;
