import { http, unwrap } from './http';
import type { ApiResponse, Order, Product } from '@/types';

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  pendingShipmentCount: number;
  totalProducts: number;
  lowStockCount: number;
}

export interface AdminOrderListQuery {
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdminOrderListResult {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminProductInput {
  name: string;
  price: number;
  description?: string | null;
  category: string;
  image?: string | null;
  stock: number;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return unwrap<AdminStats>(http.get<ApiResponse<AdminStats>>('/admin/stats'));
}

export interface DailyPoint {
  date: string;
  value: number;
}

export interface StatsHistory {
  days: number;
  ordersPerDay: DailyPoint[];
  revenuePerDay: DailyPoint[];
}

export async function fetchAdminStatsHistory(days = 7): Promise<StatsHistory> {
  return unwrap<StatsHistory>(
    http.get<ApiResponse<StatsHistory>>('/admin/stats/history', { params: { days } }),
  );
}

export async function fetchAdminOrders(query: AdminOrderListQuery = {}): Promise<AdminOrderListResult> {
  const res = await http.get<ApiResponse<Order[]>>('/admin/orders', { params: query });
  const body = res.data;
  if (!body.success || !body.data) throw new Error(body.message ?? 'Admin orders fetch failed');
  const meta = (body.meta ?? {}) as { total?: number; page?: number; limit?: number };
  return {
    items: body.data,
    total: Number(meta.total ?? 0),
    page: Number(meta.page ?? 1),
    limit: Number(meta.limit ?? 20),
  };
}

export async function shipAdminOrder(id: number): Promise<Order> {
  return unwrap<Order>(http.put<ApiResponse<Order>>(`/admin/orders/${id}/ship`));
}

export async function fetchAdminProducts(): Promise<Product[]> {
  return unwrap<Product[]>(http.get<ApiResponse<Product[]>>('/admin/products'));
}

export async function createAdminProduct(input: AdminProductInput): Promise<Product> {
  return unwrap<Product>(http.post<ApiResponse<Product>>('/admin/products', input));
}

export async function updateAdminProduct(id: number, input: AdminProductInput): Promise<Product> {
  return unwrap<Product>(http.put<ApiResponse<Product>>(`/admin/products/${id}`, input));
}

export async function deleteAdminProduct(id: number): Promise<void> {
  await http.delete(`/admin/products/${id}`);
}
