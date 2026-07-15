import { message } from 'antd';
import type { AxiosInstance } from 'axios';
import axios from 'axios';

import { env } from '~/config/env';

interface CustomAxiosInstance extends AxiosInstance {
  setAccessToken(token?: string): void;
}

const instance = axios.create({
  baseURL: env.VITE_BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
}) as CustomAxiosInstance;

instance.setAccessToken = (token?: string) => {
  if (token) {
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common['Authorization'];
  }
};

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401) {
      await message.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      localStorage.clear();
      window.location.href = '/auth/sign-in';
    }

    if (status === 403) {
      await message.error('Bạn không có quyền truy cập vào tài nguyên này.');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export const axiosClient = instance;
