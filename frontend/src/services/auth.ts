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
