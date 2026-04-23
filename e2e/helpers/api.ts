import type { APIRequestContext } from '@playwright/test';

/**
 * Thin wrappers around the backend HTTP API, used from specs to arrange
 * state without going through the UI (e.g. pre-register a user so we can
 * jump straight to the order-placement flow). Goes through the same /api
 * prefix the browser uses, so these exercise the real backend.
 */

const API_BASE = 'http://localhost:3001';

export interface Credentials {
  username: string;
  email: string;
  password: string;
}

export function uniqueCreds(prefix = 'user'): Credentials {
  // Backend validates username as ^[\w一-龥]+$ — strip anything else so
  // a spec can pass a descriptive prefix like "order-cancel" safely.
  const safePrefix = prefix.replace(/[^\w一-龥]/g, '');
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    username: `${safePrefix}${id}`,
    email: `${safePrefix}${id}@e2e.test`,
    password: 'Password123',
  };
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

interface AuthResponse {
  success: boolean;
  data: AuthSession | null;
  message: string | null;
}

export async function register(
  request: APIRequestContext,
  creds: Credentials,
): Promise<AuthSession> {
  const res = await request.post(`${API_BASE}/api/auth/register`, { data: creds });
  const body = (await res.json()) as AuthResponse;
  if (!body.success || !body.data) {
    throw new Error(`register failed: ${body.message ?? res.status()}`);
  }
  return body.data;
}

export async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });
  const body = (await res.json()) as AuthResponse;
  if (!body.success || !body.data) {
    throw new Error(`login failed: ${body.message ?? res.status()}`);
  }
  return body.data;
}

export interface AddressInput {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

interface AddressResponse {
  success: boolean;
  data: { id: number } | null;
  message: string | null;
}

export async function createAddress(
  request: APIRequestContext,
  token: string,
  input: AddressInput,
): Promise<number> {
  const res = await request.post(`${API_BASE}/api/addresses`, {
    data: input,
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as AddressResponse;
  if (!body.success || !body.data) {
    throw new Error(`createAddress failed: ${body.message ?? res.status()}`);
  }
  return body.data.id;
}

interface ProductListResponse {
  success: boolean;
  data: Array<{ id: number; name: string; price: number; stock: number }> | null;
}

export async function listProducts(
  request: APIRequestContext,
): Promise<Array<{ id: number; name: string; price: number; stock: number }>> {
  const res = await request.get(`${API_BASE}/api/products`);
  const body = (await res.json()) as ProductListResponse;
  return body.data ?? [];
}

interface CartSummaryResponse {
  success: boolean;
  data: { items: Array<{ id: number; productId: number; quantity: number }> } | null;
  message: string | null;
}

export async function addToCart(
  request: APIRequestContext,
  token: string,
  productId: number,
  quantity: number,
): Promise<number> {
  const res = await request.post(`${API_BASE}/api/cart`, {
    data: { productId, quantity },
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as CartSummaryResponse;
  if (!body.success || !body.data) {
    throw new Error(`addToCart failed: ${body.message ?? res.status()}`);
  }
  // POST /cart now returns the whole CartSummary, not a single row. Find the
  // just-added line by productId.
  const item = body.data.items.find((it) => it.productId === productId);
  if (!item) throw new Error(`addToCart: productId ${productId} missing from returned cart`);
  return item.id;
}

interface OrderResponse {
  success: boolean;
  data: { id: number; orderNo: string; status: string } | null;
  message: string | null;
}

export async function createOrder(
  request: APIRequestContext,
  token: string,
  addressId: number,
  cartItemIds: number[],
): Promise<{ id: number; orderNo: string }> {
  const res = await request.post(`${API_BASE}/api/orders`, {
    data: { addressId, cartItemIds },
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as OrderResponse;
  if (!body.success || !body.data) {
    throw new Error(`createOrder failed: ${body.message ?? res.status()}`);
  }
  return { id: body.data.id, orderNo: body.data.orderNo };
}

export async function transitionOrder(
  request: APIRequestContext,
  token: string,
  orderId: number,
  action: 'pay' | 'confirm' | 'cancel',
): Promise<void> {
  const res = await request.put(`${API_BASE}/api/orders/${orderId}/${action}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`transitionOrder(${action}) failed: ${res.status()} ${body}`);
  }
}

// Shipping is admin-only. Seed-e2e.ts provisions admin@e2e.test / AdminPass123.
export const ADMIN_EMAIL = 'admin@e2e.test';
export const ADMIN_PASSWORD = 'AdminPass123';

export async function loginAdmin(request: APIRequestContext): Promise<string> {
  const session = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  return session.token;
}

export async function adminShipOrder(
  request: APIRequestContext,
  adminToken: string,
  orderId: number,
): Promise<void> {
  const res = await request.put(`${API_BASE}/api/admin/orders/${orderId}/ship`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`adminShipOrder failed: ${res.status()} ${body}`);
  }
}

export interface CouponInput {
  code: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  minOrderAmount?: number;
  totalQuantity?: number | null;
  perUserLimit?: number;
  startsAt?: string;
  expiresAt?: string;
}

/**
 * Create a coupon via the admin API. Defaults keep the coupon active and
 * in-window so specs don't have to fill out the full zod shape.
 */
export async function createCouponAsAdmin(
  request: APIRequestContext,
  adminToken: string,
  input: CouponInput,
): Promise<void> {
  const now = new Date();
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const res = await request.post(`${API_BASE}/api/admin/coupons`, {
    data: {
      minOrderAmount: 0,
      totalQuantity: null,
      perUserLimit: 1,
      startsAt: (input.startsAt ?? new Date(now.getTime() - 60_000).toISOString()),
      expiresAt: input.expiresAt ?? later.toISOString(),
      ...input,
    },
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`createCouponAsAdmin failed: ${res.status()} ${body}`);
  }
}

interface ShipmentEventInput {
  status: 'picked_up' | 'in_transit' | 'arrived' | 'out_for_delivery' | 'delivered';
  location?: string | null;
  note?: string | null;
}

export async function addShipmentEvent(
  request: APIRequestContext,
  adminToken: string,
  orderId: number,
  input: ShipmentEventInput,
): Promise<void> {
  const res = await request.post(
    `${API_BASE}/api/admin/orders/${orderId}/shipment-events`,
    {
      data: input,
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  if (res.status() !== 201) {
    const body = await res.text();
    throw new Error(`addShipmentEvent failed: ${res.status()} ${body}`);
  }
}
