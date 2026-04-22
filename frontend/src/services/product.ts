import { http, unwrap } from './http';
import type { ApiResponse, Product } from '@/types';

export async function fetchProducts(): Promise<Product[]> {
  return unwrap<Product[]>(http.get<ApiResponse<Product[]>>('/products'));
}

export async function fetchProduct(id: number): Promise<Product> {
  return unwrap<Product>(http.get<ApiResponse<Product>>(`/products/${id}`));
}
