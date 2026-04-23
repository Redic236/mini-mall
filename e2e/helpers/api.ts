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

interface CartAddResponse {
  success: boolean;
  data: { id: number } | null;
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
  const body = (await res.json()) as CartAddResponse;
  if (!body.success || !body.data) {
    throw new Error(`addToCart failed: ${body.message ?? res.status()}`);
  }
  return body.data.id;
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
  action: 'pay' | 'ship' | 'confirm' | 'cancel',
): Promise<void> {
  const res = await request.put(`${API_BASE}/api/orders/${orderId}/${action}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(`transitionOrder(${action}) failed: ${res.status()} ${body}`);
  }
}
