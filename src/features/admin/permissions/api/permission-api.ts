import type { AxiosRequestConfig } from 'axios';

import { axiosClient } from '~/lib/axios';
import { env } from '~/config/env';
import type {
  CreatePermissionBody,
  Permission,
  PermissionSearchParams,
  UpdatePermissionBody,
} from '~/features/admin/permissions/types/Permission';
import type { BaseResponse } from '~/types';

const BASE_PATH = `${env.VITE_BASE_API_URL}/permissions`;

export const permissionApi = {
  getAll: (params?: PermissionSearchParams, config?: AxiosRequestConfig) => {
    const url = `${BASE_PATH}/get-list`;
    return axiosClient.get<BaseResponse<Permission[]>>(url, { params, ...config });
  },
  getOne: (id: Permission['Id'], config?: AxiosRequestConfig) => {
    return axiosClient.get(`${BASE_PATH}/get-by-id/${id}`, { ...config });
  },
  create: (body: CreatePermissionBody) => {
    return axiosClient.post(`${BASE_PATH}/create`, body);
  },
  update: ({ Id, ...body }: UpdatePermissionBody) => {
    return axiosClient.patch(`${BASE_PATH}/update/${Id}`, body);
  },
  delete: (id: Permission['Id']) => {
    return axiosClient.delete(`${BASE_PATH}/delete/${id}`);
  },
};
