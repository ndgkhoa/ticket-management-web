import { message } from 'antd';
import axios from 'axios';

import { env } from '~/config/env';
import { useAuthStore } from '~/stores/auth';

const instance = axios.create({
  baseURL: env.VITE_BASE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Read the token from the store on every request.
 *
 * The previous design pushed the token onto `defaults.headers` from a `useEffect`
 * that only ever *set* it — logging out left the header on this singleton until a
 * full page reload, so the next request still carried the old identity. Pulling the
 * token at request time means the store is the single source of truth and there is
 * no second copy to keep in sync.
 */
instance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().auth?.AccessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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
