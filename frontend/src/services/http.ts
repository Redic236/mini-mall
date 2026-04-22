import axios, { AxiosError, AxiosResponse } from 'axios';
import { message } from 'antd';
import type { ApiResponse } from '@/types';

export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
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
