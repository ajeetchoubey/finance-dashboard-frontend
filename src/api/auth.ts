import { api } from '../lib/fetch';
import type { ApiResponse, User } from '../types';

interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password }),

  me: () => api.get<ApiResponse<User>>('/auth/me'),
};
