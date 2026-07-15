import type { AxiosRequestConfig } from 'axios';

import { axiosClient } from '~/lib/axios';
import { env } from '~/config/env';
import type {
  CreateUserRolesBody,
  User,
  UserSearchParams,
} from '~/features/admin/users/types/User';
import type { BaseResponse } from '~/types';

const BASE_PATH = `${env.VITE_BASE_API_URL}/users`;

export const userApi = {
  getAll: (params?: UserSearchParams, config?: AxiosRequestConfig) => {
    const url = `${BASE_PATH}/get-list`;
    return axiosClient.get<BaseResponse<User[]>>(url, { params, ...config });
  },
  getOne: (id: User['Id'], config?: AxiosRequestConfig) => {
    return axiosClient.get(`${BASE_PATH}/get-by-id/${id}`, { ...config });
  },
  getInfoMine: () => {
    return axiosClient.get<{ User: User; Permissions: unknown[] }>(`${BASE_PATH}/get-info-mine`);
  },
  create: (formData: FormData) => {
    return axiosClient.post(`${BASE_PATH}/create`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: ({ Id, formData }: { Id: string; formData: FormData }) => {
    return axiosClient.patch(`${BASE_PATH}/update/${Id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id: User['Id']) => {
    return axiosClient.delete(`${BASE_PATH}/delete/${id}`);
  },
  getRoles: (userId: User['Id']) => {
    return axiosClient.get(`user-roles/get-user-roles/${userId}`);
  },
  createRoles(
    { userId, body }: { userId: string; body: CreateUserRolesBody },
    config?: AxiosRequestConfig
  ) {
    return axiosClient.post(`user-roles/create-user-roles/${userId}`, body, config);
  },
  deleteRoles: (roleIds: string[], config?: AxiosRequestConfig) => {
    return axiosClient.delete(`user-roles/delete-user-roles`, {
      data: roleIds,
      ...config,
    });
  },
};
