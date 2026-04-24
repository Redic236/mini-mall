import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import type { ApiResponse, PagedResult } from '@/types';
import { clearAuth, getStoredToken, notifyUnauthorized } from './tokenStore';

// Extend axios config to let call-sites opt out of the interceptor's default
// toast. Pages that render their own empty/error state (e.g. recommendations,
// shipment timeline) want the raw rejection without an extra floating banner.
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

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

// Throttle 401 toasts. When a token expires, every in-flight request 401s in
// quick succession and the naive implementation stacks a toast per request.
// Show at most one "登录已过期" toast per window.
const UNAUTHORIZED_TOAST_WINDOW_MS = 3_000;
let lastUnauthorizedToastAt = 0;

function showUnauthorizedToastOnce(): void {
  const now = Date.now();
  if (now - lastUnauthorizedToastAt < UNAUTHORIZED_TOAST_WINDOW_MS) return;
  lastUnauthorizedToastAt = now;
  void message.warning('登录已过期，请重新登录');
}

http.interceptors.response.use(
  <T,>(res: AxiosResponse<ApiResponse<T>>) => {
    if (res.data && res.data.success === false) {
      if (!res.config.skipErrorToast) {
        void message.error(res.data.message ?? '请求失败');
      }
      return Promise.reject(new Error(res.data.message ?? 'Request failed'));
    }
    return res;
  },
  (err: AxiosError<ApiResponse<null>>) => {
    const status = err.response?.status;
    // A 401 only means "your session expired" when there was a session to
    // begin with. 401 on a login/register attempt means "bad credentials"
    // — surface the backend's message ("邮箱或密码错误") instead of the
    // misleading "登录已过期" toast.
    if (status === 401 && getStoredToken()) {
      clearAuth();
      notifyUnauthorized();
      if (!err.config?.skipErrorToast) showUnauthorizedToastOnce();
      return Promise.reject(err);
    }
    if (!err.config?.skipErrorToast) {
      const msg = err.response?.data?.message ?? err.message ?? '网络错误';
      void message.error(msg);
    }
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
