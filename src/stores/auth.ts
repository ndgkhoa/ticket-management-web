import { persist, devtools } from 'zustand/middleware';
import { create } from 'zustand';

import type { AuthProviders } from '~/features/auth/types/AuthProviders';

export type AuthType = {
  UserId?: string;
  AccessToken?: string;
  RefreshToken?: string;
};

export type AuthDataType = AuthType & {
  isAuthenticated: boolean;
  provider: AuthProviders;
};

export type AuthStoreType = {
  auth: AuthDataType | null;
  setAuth: (auth: AuthDataType | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStoreType>()(
  devtools(
    persist(
      (set) => ({
        auth: null,
        setAuth: (auth) => {
          set({ auth });
        },
        logout: () => {
          set({ auth: null });
        },
      }),
      {
        // Each persisted store needs its OWN key. Both this store and the
        // preferences store used to persist under 'local-storage', so whichever
        // wrote last replaced the other's entry wholesale — logging in and then
        // toggling the theme silently destroyed the session.
        name: 'auth-storage',
      }
    ),
    { name: 'AuthStore' }
  )
);
