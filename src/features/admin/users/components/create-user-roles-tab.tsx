import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Table } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { TableColumnsType, TableProps } from 'antd';

import { Notification } from '~/utils';
import { queryClient } from '~/lib/query-client';
import { userApi } from '~/features/admin/users/api/user-api';
import { roleApi } from '~/features/admin/roles/api/role-api';
import type { UserRolesTabRef } from '~/features/admin/users/components/user-roles-modal';
import type { CreateUserRolesBody, User, UserRole } from '~/features/admin/users/types/User';
import type { Role } from '~/features/admin/roles/types/Role';

interface Props {
  userId?: User['Id'];
}

interface DataType {
  RoleId: string;
  RoleName: string;
  Description: string;
}

const CreateUserRolesTab = forwardRef<UserRolesTabRef, Props>((props, ref) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data: userRolesData, isPending: isUserRolesPending } = useQuery({
    queryKey: ['user', 'roles', props.userId],
    queryFn: () => userApi.getRoles(props.userId!),
    enabled: !!props.userId,
  });

  const { data: allRolesData, isPending: isAllRolesPending } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => roleApi.getAll({ pageSize: 100 }),
  });

  const userRoles: UserRole[] = userRolesData?.data.Data ?? [];
  const allRoles: Role[] = allRolesData?.data.Data ?? [];

  const filteredRoles: DataType[] = useMemo(() => {
    return allRoles
      .filter((p) => !userRoles.some((ur) => ur.RoleId === p.Id))
      .map((r) => ({
        RoleId: r.Id,
        RoleName: r.RoleName,
        Description: r.Description,
      }));
  }, [allRoles, userRoles]);

  const rowSelection: TableProps<DataType>['rowSelection'] = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const mutation = useMutation({
    mutationFn: (body: CreateUserRolesBody) =>
      userApi.createRoles({
        userId: props.userId!,
        body,
      }),
    onSuccess: (res) => {
      message.success(Notification.success(res).message);
      queryClient.invalidateQueries({
        queryKey: ['user', 'roles', props.userId],
      });
      setSelectedRowKeys([]);
    },
    onError: (err) => {
      message.error(Notification.error(err).message);
    },
  });

  const handleSubmit = () => {
    const payload = selectedRowKeys.map((key) => key.toString());

    if (selectedRowKeys.length === 0) {
      message.warning(t('Validation.SelectAtLeastOne', { name: t('Fields.Role', { count: 1 }) }));

      return false;
    }

    mutation.mutate(payload);
    return true;
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    reset: () => {
      setSelectedRowKeys([]);
    },
  }));

  const columns: TableColumnsType<DataType> = [
    {
      title: t('Fields.RoleName'),
      dataIndex: 'RoleName',
    },
    {
      title: t('Fields.Description'),
      dataIndex: 'Description',
    },
  ];

  return (
    <Table<DataType>
      bordered
      rowKey="RoleId"
      rowSelection={{ type: 'checkbox', ...rowSelection }}
      columns={columns}
      dataSource={filteredRoles}
      loading={isUserRolesPending || isAllRolesPending}
      pagination={{
        pageSize: 5,
      }}
    />
  );
});

export default CreateUserRolesTab;
