import { http, unwrap } from './http';
import type { ApiResponse, Coupon, CouponPreview } from '@/types';

export interface CouponInput {
  code: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  minOrderAmount: number;
  startsAt: string;
  expiresAt: string;
  totalQuantity: number | null;
  perUserLimit: number;
  isActive?: boolean;
}

export async function fetchPublicCoupons(): Promise<Coupon[]> {
  return unwrap<Coupon[]>(http.get<ApiResponse<Coupon[]>>('/coupons'));
}

export async function previewCoupon(code: string, orderAmount: number): Promise<CouponPreview> {
  return unwrap<CouponPreview>(
    http.post<ApiResponse<CouponPreview>>('/coupons/preview', { code, orderAmount }),
  );
}

export async function fetchAdminCoupons(): Promise<Coupon[]> {
  return unwrap<Coupon[]>(http.get<ApiResponse<Coupon[]>>('/admin/coupons'));
}

export async function createAdminCoupon(input: CouponInput): Promise<Coupon> {
  return unwrap<Coupon>(http.post<ApiResponse<Coupon>>('/admin/coupons', input));
}

export async function updateAdminCoupon(id: number, input: CouponInput): Promise<Coupon> {
  return unwrap<Coupon>(http.put<ApiResponse<Coupon>>(`/admin/coupons/${id}`, input));
}

export async function deleteAdminCoupon(id: number): Promise<void> {
  await http.delete(`/admin/coupons/${id}`);
}
