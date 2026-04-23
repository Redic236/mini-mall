import { http, unwrap } from './http';
import type { ApiResponse, CategorySummary, Product, ProductFilter } from '@/types';

export async function fetchProducts(filter: ProductFilter = {}): Promise<Product[]> {
  const params: Record<string, string> = {};
  if (filter.keyword) params.keyword = filter.keyword;
  if (filter.category) params.category = filter.category;
  if (filter.minPrice !== undefined) params.minPrice = String(filter.minPrice);
  if (filter.maxPrice !== undefined) params.maxPrice = String(filter.maxPrice);
  if (filter.sort && filter.sort !== 'default') params.sort = filter.sort;
  return unwrap<Product[]>(http.get<ApiResponse<Product[]>>('/products', { params }));
}

export async function fetchProduct(id: number): Promise<Product> {
  return unwrap<Product>(http.get<ApiResponse<Product>>(`/products/${id}`));
}

export async function fetchCategories(): Promise<CategorySummary[]> {
  return unwrap<CategorySummary[]>(http.get<ApiResponse<CategorySummary[]>>('/products/categories'));
}

export interface ProductRecommendation {
  product: Product;
  score: number;
  source: 'cf' | 'category-fallback';
}

export async function fetchRecommendations(id: number, limit = 6): Promise<ProductRecommendation[]> {
  return unwrap<ProductRecommendation[]>(
    http.get<ApiResponse<ProductRecommendation[]>>(`/products/${id}/recommendations`, {
      params: { limit },
    }),
  );
}
