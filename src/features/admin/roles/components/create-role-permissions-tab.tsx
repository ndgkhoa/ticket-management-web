import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { App, Checkbox, Table } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { TableProps } from 'antd';

import { Notification } from '~/utils';
import { queryClient } from '~/lib/query-client';
import { roleApi } from '~/features/admin/roles/api/role-api';
import { permissionApi } from '~/features/admin/permissions/api/permission-api';
import type { RolePermissionsTabRef } from '~/features/admin/roles/components/role-permissions-modal';
import type {
  CreateRolePermissionsBody,
  Role,
  RolePermission,
} from '~/features/admin/roles/types/Role';
import type { Permission } from '~/features/admin/permissions/types/Permission';

interface Props {
  roleId?: Role['Id'];
}

interface DataType {
  PermissionId: string;
  PermissionName: string;
  C: boolean;
  R: boolean;
  U: boolean;
  D: boolean;
}

const CreateRolePermissionsTab = forwardRef<RolePermissionsTabRef, Props>((props, ref) => {
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [selectedPermissions, setSelectedPermissions] = useState<DataType[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<DataType[]>([]);

  const { data: rolePermissionsData, isPending: isRolePermissionsPending } = useQuery({
    queryKey: ['role', 'permissions', props.roleId],
    queryFn: () => roleApi.getPermissions(props.roleId!),
    enabled: !!props.roleId,
  });

  const { data: allPermissionsData, isPending: isAllPermissionsPending } = useQuery({
    queryKey: ['permissions', 'all'],
    queryFn: () => permissionApi.getAll({ pageSize: 100 }),
  });

  const rolePermissions: RolePermission[] = rolePermissionsData?.data.Data.Permissions ?? [];
  const allPermissions: Permission[] = allPermissionsData?.data.Data ?? [];

  const filteredPermissions: DataType[] = useMemo(() => {
    return allPermissions
      .filter((p) => !rolePermissions.some((rp) => rp.PermissionId === p.Id))
      .map((p) => ({
        PermissionId: p.Id,
        PermissionName: p.PermissionName,
        C: false,
        R: false,
        U: false,
        D: false,
      }));
  }, [allPermissions, rolePermissions]);

  useEffect(() => {
    if (
      JSON.stringify(selectedPermissions) !== JSON.stringify(filteredPermissions) ||
      JSON.stringify(initialPermissions) !== JSON.stringify(filteredPermissions)
    ) {
      setSelectedPermissions(filteredPermissions);
      setInitialPermissions(filteredPermissions);
    }
  }, [filteredPermissions]);

  const toggleCheckbox = (
    index: number,
    key: keyof Omit<DataType, 'PermissionId' | 'PermissionName'>
  ) => {
    setSelectedPermissions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [key]: !updated[index][key],
      };
      return updated;
    });
  };

  const mutation = useMutation({
    mutationFn: (body: CreateRolePermissionsBody) =>
      roleApi.createPermissions({
        roleId: props.roleId!,
        body,
      }),
    onSuccess: (res) => {
      message.success(Notification.success(res).message);
      queryClient.invalidateQueries({
        queryKey: ['role', 'permissions', props.roleId],
      });
    },
    onError: (err) => {
      message.error(Notification.error(err).message);
    },
  });

  const handleSubmit = () => {
    const payload = selectedPermissions
      .filter(({ C, R, U, D }) => C || R || U || D)
      .map(({ PermissionId, C, R, U, D }) => ({
        PermissionId,
        C,
        R,
        U,
        D,
      }));

    if (payload.length === 0) {
      message.warning(
        t('Validation.SelectAtLeastOne', { name: t('Fields.Permission', { count: 1 }) })
      );
      return false;
    }

    mutation.mutate(payload);
    return true;
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    reset: () => {
      setSelectedPermissions(initialPermissions);
    },
  }));

  const renderCheckbox =
    (key: keyof Pick<DataType, 'C' | 'R' | 'U' | 'D'>) =>
    (_: unknown, __: DataType, index: number) => (
      <Checkbox
        checked={selectedPermissions[index]?.[key]}
        onChange={() => toggleCheckbox(index, key)}
      />
    );

  const columns: TableProps<DataType>['columns'] = [
    { title: t('Fields.PermissionName'), dataIndex: 'PermissionName' },
    { title: 'C', render: renderCheckbox('C') },
    { title: 'R', render: renderCheckbox('R') },
    { title: 'U', render: renderCheckbox('U') },
    { title: 'D', render: renderCheckbox('D') },
  ];

  return (
    <Table
      bordered
      rowKey="PermissionId"
      columns={columns}
      dataSource={selectedPermissions}
      loading={isRolePermissionsPending || isAllPermissionsPending}
      pagination={{
        pageSize: 5,
      }}
    />
  );
});

export default CreateRolePermissionsTab;
