import { http, unwrap } from './http';
import type { ApiResponse, AuthResult, User } from '@/types';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  return unwrap<AuthResult>(http.post<ApiResponse<AuthResult>>('/auth/register', input));
}

export async function login(input: LoginInput): Promise<AuthResult> {
  return unwrap<AuthResult>(http.post<ApiResponse<AuthResult>>('/auth/login', input));
}

export async function fetchMe(): Promise<User> {
  // App-boot session validation: a 401 here just means "no valid token",
  // which authSlice handles by clearing storage. Don't let the global
  // interceptor toast the user with a scary "登录已过期" on first visit.
  return unwrap<User>(http.get<ApiResponse<User>>('/auth/me', { skipErrorToast: true }));
}

export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append('avatar', file);
  return unwrap<User>(
    http.post<ApiResponse<User>>('/auth/me/avatar', form, {
      // Let the browser set multipart/form-data with the correct boundary —
      // our shared instance defaults to application/json which would fail.
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  );
}
