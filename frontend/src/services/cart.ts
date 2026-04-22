import { http, unwrap } from './http';
import type { ApiResponse, CartItem, CartSummary } from '@/types';

export async function fetchCart(): Promise<CartSummary> {
  return unwrap<CartSummary>(http.get<ApiResponse<CartSummary>>('/cart'));
}

export async function addCart(productId: number, quantity: number): Promise<CartItem> {
  return unwrap<CartItem>(http.post<ApiResponse<CartItem>>('/cart', { productId, quantity }));
}

export async function updateCart(id: number, quantity: number): Promise<CartItem> {
  return unwrap<CartItem>(http.put<ApiResponse<CartItem>>(`/cart/${id}`, { quantity }));
}

export async function removeCart(id: number): Promise<void> {
  await http.delete<ApiResponse<null>>(`/cart/${id}`);
}
