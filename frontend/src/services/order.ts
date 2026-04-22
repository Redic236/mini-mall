import { http, unwrap } from './http';
import type { ApiResponse, Order, OrderStatus } from '@/types';

export async function fetchOrders(status?: OrderStatus): Promise<Order[]> {
  const params = status ? { status } : undefined;
  return unwrap<Order[]>(http.get<ApiResponse<Order[]>>('/orders', { params }));
}

export async function fetchOrder(id: number): Promise<Order> {
  return unwrap<Order>(http.get<ApiResponse<Order>>(`/orders/${id}`));
}

export async function createOrder(addressId: number, cartItemIds: number[]): Promise<Order> {
  return unwrap<Order>(
    http.post<ApiResponse<Order>>('/orders', { addressId, cartItemIds }),
  );
}

export async function cancelOrder(id: number): Promise<Order> {
  return unwrap<Order>(http.put<ApiResponse<Order>>(`/orders/${id}/cancel`));
}
