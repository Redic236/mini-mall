export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  meta?: Record<string, unknown>;
}

export type UserRole = 'user' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  role: UserRole;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category: string;
  image: string | null;
  stock: number;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategorySummary {
  category: string;
  count: number;
}

export interface ProductFilter {
  keyword?: string;
  category?: string;
}

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product?: Product;
}

export interface CartSummary {
  items: CartItem[];
  totalPrice: number;
  totalQuantity: number;
}

export interface Address {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean };

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  product?: Product;
}

export const ORDER_STATUS_VALUES = ['待支付', '已支付', '已发货', '已完成', '已取消'] as const;
export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export interface Order {
  id: number;
  orderNo: string;
  addressId: number;
  // Address snapshot frozen at placement time. Prefer these over the nested
  // `address` object when rendering historical orders, since the referenced
  // address row may have been edited since.
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  totalAmount: number;
  status: OrderStatus;
  items?: OrderItem[];
  address?: Address;
  createdAt?: string;
}

export interface ReviewAuthor {
  id: number;
  username: string;
  avatar: string | null;
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  orderId: number;
  rating: number;
  content: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: ReviewAuthor;
  product?: Product;
}

export interface MyReviewsResult {
  items: Review[];
  total: number;
  page: number;
  limit: number;
}

export interface ReviewListResult {
  items: Review[];
  total: number;
  averageRating: number;
  page: number;
  limit: number;
}

export interface ReviewEligibility {
  canReview: boolean;
  alreadyReviewed: boolean;
  eligibleOrderId: number | null;
}
