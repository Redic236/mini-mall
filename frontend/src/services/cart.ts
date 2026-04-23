import { http, unwrap } from './http';
import type { ApiResponse, CartSummary } from '@/types';

export async function fetchCart(): Promise<CartSummary> {
  return unwrap<CartSummary>(http.get<ApiResponse<CartSummary>>('/cart'));
}

// All mutations return the full refreshed cart summary so the client can
// update state in one roundtrip instead of chasing a separate GET /cart.
export async function addCart(productId: number, quantity: number): Promise<CartSummary> {
  return unwrap<CartSummary>(
    http.post<ApiResponse<CartSummary>>('/cart', { productId, quantity }),
  );
}

export async function updateCart(id: number, quantity: number): Promise<CartSummary> {
  return unwrap<CartSummary>(http.put<ApiResponse<CartSummary>>(`/cart/${id}`, { quantity }));
}

export async function removeCart(id: number): Promise<CartSummary> {
  return unwrap<CartSummary>(http.delete<ApiResponse<CartSummary>>(`/cart/${id}`));
}
