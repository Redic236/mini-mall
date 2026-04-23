import { http, unwrap } from './http';
import type { ApiResponse } from '@/types';

export type PaymentOutcome = 'success' | 'failed' | 'cancelled';

export interface PayIntentResult {
  paymentId: number;
  amount: number;
  method: 'alipay_sandbox' | 'wechat_sandbox';
  gatewayUrl: string;
  // Sandbox-only affordance: in a real gateway integration the signatures
  // are produced by the gateway server. Here they come back with the
  // intent so the /checkout UI can post a matching callback without a
  // round-trip through a fake gateway service.
  debugSignatures: Record<PaymentOutcome, string>;
}

export interface CallbackResult {
  paymentId: number;
  status: string;
  orderId: number;
  orderStatus: string;
  gatewayTxId: string | null;
}

export interface PaymentRow {
  id: number;
  orderId: number;
  method: string;
  amount: number;
  status: string;
  gatewayTxId: string | null;
  paidAt: string | null;
  createdAt?: string;
}

export async function createPayIntent(
  orderId: number,
  method: PayIntentResult['method'],
): Promise<PayIntentResult> {
  return unwrap<PayIntentResult>(
    http.post<ApiResponse<PayIntentResult>>(`/orders/${orderId}/pay-intent`, { method }),
  );
}

export async function submitGatewayCallback(
  paymentId: number,
  outcome: PaymentOutcome,
  amount: number,
  signature: string,
): Promise<CallbackResult> {
  return unwrap<CallbackResult>(
    http.post<ApiResponse<CallbackResult>>('/payments/callback', {
      paymentId,
      outcome,
      amount,
      signature,
    }),
  );
}

export async function fetchPayment(id: number): Promise<PaymentRow> {
  return unwrap<PaymentRow>(http.get<ApiResponse<PaymentRow>>(`/payments/${id}`));
}

export async function listOrderPayments(orderId: number): Promise<PaymentRow[]> {
  return unwrap<PaymentRow[]>(
    http.get<ApiResponse<PaymentRow[]>>(`/orders/${orderId}/payments`),
  );
}
