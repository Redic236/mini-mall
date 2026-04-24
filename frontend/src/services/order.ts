import { http, unwrap, unwrapPaged } from './http';
import type { ApiResponse, Order, OrderStatus, PagedResult } from '@/types';

export interface OrderListQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export async function fetchOrders(query: OrderListQuery = {}): Promise<PagedResult<Order>> {
  const params: Record<string, string> = {};
  if (query.status) params.status = query.status;
  if (query.page) params.page = String(query.page);
  if (query.limit) params.limit = String(query.limit);
  return unwrapPaged<Order>(http.get<ApiResponse<Order[]>>('/orders', { params }));
}

export async function fetchOrder(id: number): Promise<Order> {
  return unwrap<Order>(http.get<ApiResponse<Order>>(`/orders/${id}`));
}

export async function createOrder(
  addressId: number,
  cartItemIds: number[],
  couponCode?: string,
): Promise<Order> {
  return unwrap<Order>(
    http.post<ApiResponse<Order>>('/orders', {
      addressId,
      cartItemIds,
      ...(couponCode ? { couponCode } : {}),
    }),
  );
}

export async function cancelOrder(id: number): Promise<Order> {
  return unwrap<Order>(http.put<ApiResponse<Order>>(`/orders/${id}/cancel`));
}

export async function payOrder(id: number): Promise<Order> {
  return unwrap<Order>(http.put<ApiResponse<Order>>(`/orders/${id}/pay`));
}

export async function confirmOrder(id: number): Promise<Order> {
  return unwrap<Order>(http.put<ApiResponse<Order>>(`/orders/${id}/confirm`));
}

export async function deleteOrder(id: number): Promise<null> {
  return unwrap<null>(http.delete<ApiResponse<null>>(`/orders/${id}`));
}

export async function bulkDeleteCompletedOrders(): Promise<{ affected: number }> {
  return unwrap<{ affected: number }>(
    http.delete<ApiResponse<{ affected: number }>>('/orders/bulk/completed'),
  );
}
