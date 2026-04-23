import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import type { ApiResponse, PagedResult } from '@/types';
import { clearAuth, getStoredToken, notifyUnauthorized } from './tokenStore';

export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  <T,>(res: AxiosResponse<ApiResponse<T>>) => {
    if (res.data && res.data.success === false) {
      message.error(res.data.message ?? '请求失败');
      return Promise.reject(new Error(res.data.message ?? 'Request failed'));
    }
    return res;
  },
  (err: AxiosError<ApiResponse<null>>) => {
    if (err.response?.status === 401) {
      clearAuth();
      notifyUnauthorized();
    }
    const msg = err.response?.data?.message ?? err.message ?? '网络错误';
    message.error(msg);
    return Promise.reject(err);
  },
);

export async function unwrap<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const res = await promise;
  if (!res.data.success || res.data.data === null) {
    throw new Error(res.data.message ?? 'Empty response');
  }
  return res.data.data;
}

/**
 * Unwrap a response whose body is `{ data: T[], meta: { total, page, limit } }`
 * into the frontend's `PagedResult<T>`. Falls back to page=1 + total=items.length
 * when meta is missing so legacy endpoints keep working.
 */
export async function unwrapPaged<T>(
  promise: Promise<AxiosResponse<ApiResponse<T[]>>>,
): Promise<PagedResult<T>> {
  const res = await promise;
  const body = res.data;
  if (!body.success || body.data === null) {
    throw new Error(body.message ?? 'Empty response');
  }
  const meta = (body.meta ?? {}) as { total?: number; page?: number; limit?: number };
  return {
    items: body.data,
    total: Number(meta.total ?? body.data.length),
    page: Number(meta.page ?? 1),
    limit: Number(meta.limit ?? body.data.length),
  };
}
