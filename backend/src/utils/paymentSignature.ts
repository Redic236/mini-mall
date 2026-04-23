import crypto from 'node:crypto';

/**
 * HMAC signing for the sandbox payment callback. In a real gateway
 * integration (Alipay, Stripe, etc.) the gateway server signs with a
 * shared secret and the callback is server-to-server — we replicate that
 * shape here so the wire format stays recognisable even though both ends
 * happen to live in this repo.
 */

function getSecret(): string {
  const secret = process.env.PAYMENT_SANDBOX_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PAYMENT_SANDBOX_SECRET must be set in production');
    }
    return 'dev-payment-sandbox-secret-change-me';
  }
  return secret;
}

export type PaymentOutcome = 'success' | 'failed' | 'cancelled';

export function signPayment(paymentId: number, outcome: PaymentOutcome, amount: number): string {
  const payload = `${paymentId}|${outcome}|${amount.toFixed(2)}`;
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function verifyPaymentSignature(
  paymentId: number,
  outcome: PaymentOutcome,
  amount: number,
  signature: string,
): boolean {
  const expected = signPayment(paymentId, outcome, amount);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Fake gateway transaction id. Real gateways return their own reference
 * number on success; we synthesise one so the audit trail looks plausible.
 */
export function generateGatewayTxId(): string {
  return `SBX${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
