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
  return unwrap<User>(http.get<ApiResponse<User>>('/auth/me'));
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
