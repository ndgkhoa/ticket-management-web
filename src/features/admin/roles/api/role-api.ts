import type { AxiosRequestConfig } from 'axios';

import { axiosClient } from '~/lib/axios';
import { env } from '~/config/env';
import type {
  CreateRoleBody,
  CreateRolePermissionsBody,
  Role,
  RoleSearchParams,
  UpdateRoleBody,
  UpdateRolePermissionsBody,
} from '~/features/admin/roles/types/Role';
import type { BaseResponse } from '~/types';

const BASE_PATH = `${env.VITE_BASE_API_URL}/roles`;

export const roleApi = {
  getAll: (params?: RoleSearchParams, config?: AxiosRequestConfig) => {
    const url = `${BASE_PATH}/get-list`;
    return axiosClient.get<BaseResponse<Role[]>>(url, { params, ...config });
  },
  getOne: (id: Role['Id'], config?: AxiosRequestConfig) => {
    return axiosClient.get(`${BASE_PATH}/get-by-id/${id}`, { ...config });
  },
  create: (body: CreateRoleBody) => {
    return axiosClient.post(`${BASE_PATH}/create`, body);
  },
  update: ({ Id, ...body }: UpdateRoleBody) => {
    return axiosClient.patch(`${BASE_PATH}/update/${Id}`, body);
  },
  delete: (id: Role['Id']) => {
    return axiosClient.delete(`${BASE_PATH}/delete/${id}`);
  },
  getPermissions: (roleId: Role['Id']) => {
    return axiosClient.get(`role-permissions/get-role-permissions/${roleId}`);
  },
  createPermissions(
    { roleId, body }: { roleId: string; body: CreateRolePermissionsBody },
    config?: AxiosRequestConfig
  ) {
    return axiosClient.post(`role-permissions/create-role-permissions/${roleId}`, body, config);
  },
  updatePermissions: (body: UpdateRolePermissionsBody, config?: AxiosRequestConfig) => {
    return axiosClient.patch(`role-permissions/update-role-permissions`, body, config);
  },
  deletePermissions: (roleIds: string[], config?: AxiosRequestConfig) => {
    return axiosClient.delete(`role-permissions/delete-role-permissions`, {
      data: roleIds,
      ...config,
    });
  },
};
