import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email?: string;
  display_name?: string;
  profile_photo_url?: string | null;
  is_admin: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setTokens: (access: string, refresh: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
  getAccessToken: () => string | null;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAdmin: false,
      isAuthenticated: false,
      _hasHydrated: false,

      setTokens: (access, refresh, user) =>
        set({
          accessToken: access,
          refreshToken: refresh,
          user,
          isAdmin: user.is_admin,
          isAuthenticated: true,
        }),

      setUser: (user) =>
        set({
          user,
          isAdmin: user.is_admin,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAdmin: false,
          isAuthenticated: false,
        }),

      getAccessToken: () => get().accessToken,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'birdbook-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAdmin: state.isAdmin,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
