import { api } from '../lib/fetch';
import type { ApiResponse, User, PaginatedResponse, Role, UserStatus } from '../types';

export interface UsersParams {
  page?: number;
  limit?: number;
  status?: UserStatus;
  role?: Role;
  search?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  status?: UserStatus;
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][];
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export const usersApi = {
  list: (params?: UsersParams) =>
    api.get<ApiResponse<PaginatedResponse<User>>>(`/users${buildQuery(params as Record<string, string | number | undefined>)}`),

  get: (id: string) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  create: (payload: CreateUserPayload) =>
    api.post<ApiResponse<User>>('/users', payload),

  update: (id: string, payload: Partial<{ name: string; role: Role; status: UserStatus; password: string }>) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, payload),

  updateStatus: (id: string, status: UserStatus) =>
    api.patch<ApiResponse<User>>(`/users/${id}/status`, { status }),
};
