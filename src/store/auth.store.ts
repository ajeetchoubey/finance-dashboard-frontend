import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

export type Permission =
  | 'dashboard.read'
  | 'records.read'
  | 'records.write'
  | 'users.manage'
  | 'roles.manage';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  viewer: ['dashboard.read'],
  analyst: ['dashboard.read', 'records.read'],
  admin: ['dashboard.read', 'records.read', 'records.write', 'users.manage', 'roles.manage'],
};

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      can: (permission) => {
        const user = get().user;
        if (!user) return false;
        return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
      },
    }),
    { name: 'finance-auth' },
  ),
);
