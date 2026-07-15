import { useTranslation } from 'react-i18next';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { App, Checkbox, Table } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { TableProps } from 'antd';

import { Notification } from '~/utils';
import { queryClient } from '~/lib/query-client';
import { roleApi } from '~/features/admin/roles/api/role-api';
import type {
  Role,
  RolePermission,
  UpdateRolePermissionsBody,
} from '~/features/admin/roles/types/Role';
import type { RolePermissionsTabRef } from '~/features/admin/roles/components/role-permissions-modal';
import DeleteRolePermissionsConfirmation from '~/features/admin/roles/components/delete-role-permissions-confirmation';

interface Props {
  roleId?: Role['Id'];
}

const UpdateRolePermissionsTab = forwardRef<RolePermissionsTabRef, Props>((props, ref) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [permissions, setPermissions] = useState<RolePermission[]>([]);

  const rolePermissionsQuery = useQuery({
    queryKey: ['role', 'permissions', props.roleId],
    queryFn: () => roleApi.getPermissions(props.roleId!),
    enabled: !!props.roleId,
  });

  const initialPermissions = useMemo(() => {
    return rolePermissionsQuery.data?.data?.Data?.Permissions ?? [];
  }, [rolePermissionsQuery.data]);

  useEffect(() => {
    setPermissions(initialPermissions.map((item: RolePermission) => ({ ...item })));
  }, [initialPermissions]);

  const mutation = useMutation({
    mutationFn: (body: UpdateRolePermissionsBody) => roleApi.updatePermissions(body),
    onSuccess: (response) => {
      message.success(Notification.success(response).message);
      queryClient.invalidateQueries({ queryKey: ['role', 'permissions'] });
    },
    onError(error) {
      message.error(Notification.error(error).message);
    },
  });

  const handleCheck = (
    id: string,
    key: keyof Pick<RolePermission, 'C' | 'R' | 'U' | 'D'>,
    value: boolean
  ) => {
    setPermissions((prev) =>
      prev.map((item) => (item.Id === id ? { ...item, [key]: value } : item))
    );
  };

  const handleSubmit = () => {
    const payload = permissions.map(({ Id, C, R, U, D }) => ({
      Id,
      C,
      R,
      U,
      D,
    }));
    mutation.mutate(payload);
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    reset: () => {
      setPermissions(initialPermissions.map((item: RolePermission) => ({ ...item })));
    },
  }));

  const renderCheckbox =
    (key: keyof Pick<RolePermission, 'C' | 'R' | 'U' | 'D'>) =>
    (_: unknown, record: RolePermission) => (
      <Checkbox
        checked={record[key]}
        onChange={(e) => handleCheck(record.Id, key, e.target.checked)}
      />
    );

  const columns: TableProps<RolePermission>['columns'] = [
    {
      title: '-',
      dataIndex: 'Id',
      key: 'Id',
      align: 'center' as const,
      render: (value) => {
        return <DeleteRolePermissionsConfirmation rolePermissionId={value} />;
      },
      width: 100,
    },
    { title: t('Fields.PermissionName'), dataIndex: 'PermissionName' },
    { title: 'C', dataIndex: 'C', render: renderCheckbox('C') },
    { title: 'R', dataIndex: 'R', render: renderCheckbox('R') },
    { title: 'U', dataIndex: 'U', render: renderCheckbox('U') },
    { title: 'D', dataIndex: 'D', render: renderCheckbox('D') },
  ];

  return (
    <Table<RolePermission>
      bordered
      rowKey="Id"
      columns={columns}
      loading={rolePermissionsQuery.isPending}
      dataSource={permissions}
      pagination={{
        pageSize: 5,
      }}
    />
  );
});

export default UpdateRolePermissionsTab;
