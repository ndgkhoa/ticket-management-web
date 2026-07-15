import { axiosClient } from '~/lib/axios';
import type { BaseResponse } from '~/types';
import type { AuthType } from '~/stores/auth';

const BASE_PATH = '/users';

export const authApi = {
  loginWithUserName: (body: { UserName: string; Password: string }) => {
    return axiosClient.post<BaseResponse<AuthType>>(`${BASE_PATH}/login`, body, {
      headers: { X_DEVICE_UDID: '00000000-0000-0000-0000-000000000000' },
    });
  },
  loginWithGoogle: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      Message: 'Đăng nhập bằng Google thành công!',
    };
  },
};
