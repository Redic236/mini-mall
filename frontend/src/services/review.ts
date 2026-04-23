import { http, unwrap } from './http';
import type {
  ApiResponse,
  MyReviewsResult,
  Review,
  ReviewEligibility,
  ReviewListResult,
} from '@/types';

export interface ReviewInput {
  productId: number;
  rating: number;
  content?: string;
}

export interface ReviewUpdateInput {
  rating: number;
  content?: string;
}

export async function fetchReviews(productId: number, page = 1, limit = 10): Promise<ReviewListResult> {
  return unwrap<ReviewListResult>(
    http.get<ApiResponse<ReviewListResult>>('/reviews', { params: { productId, page, limit } }),
  );
}

export async function fetchMyReviews(page = 1, limit = 10): Promise<MyReviewsResult> {
  return unwrap<MyReviewsResult>(
    http.get<ApiResponse<MyReviewsResult>>('/reviews/mine', { params: { page, limit } }),
  );
}

export async function fetchEligibility(productId: number): Promise<ReviewEligibility> {
  return unwrap<ReviewEligibility>(
    http.get<ApiResponse<ReviewEligibility>>('/reviews/eligibility', { params: { productId } }),
  );
}

export async function createReview(input: ReviewInput): Promise<Review> {
  return unwrap<Review>(http.post<ApiResponse<Review>>('/reviews', input));
}

export async function updateReview(id: number, input: ReviewUpdateInput): Promise<Review> {
  return unwrap<Review>(http.put<ApiResponse<Review>>(`/reviews/${id}`, input));
}

export async function deleteReview(id: number): Promise<void> {
  await http.delete<ApiResponse<null>>(`/reviews/${id}`);
}
