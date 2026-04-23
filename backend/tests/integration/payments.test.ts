import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, Order, ORDER_STATUS, Payment, PAYMENT_STATUS } from '../helpers/db';
import { makeAuthed, createUser, type AuthedUser } from '../helpers/auth';
import { signPayment } from '../../src/utils/paymentSignature';

async function addCartItem(authHeader: [string, string], productId: number, quantity: number): Promise<number> {
  const res = await request(getApp()).post('/api/cart').set(...authHeader).send({ productId, quantity });
  return res.body.data.id as number;
}

async function placeOrder(me: AuthedUser, data: SeededData, cartItemId: number): Promise<number> {
  const res = await request(getApp())
    .post('/api/orders')
    .set(...me.authHeader)
    .send({ addressId: data.address!.get('id'), cartItemIds: [cartItemId] });
  return res.body.data.id as number;
}

describe('Payments (sandbox)', () => {
  let data: SeededData;
  let me: AuthedUser;
  let orderId: number;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
    const cartId = await addCartItem(me.authHeader, data.products[0].id, 1);
    orderId = await placeOrder(me, data, cartId);
  });

  describe('POST /api/orders/:id/pay-intent', () => {
    it('creates a pending payment and returns a gateway URL + debug signatures', async () => {
      const res = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'alipay_sandbox' });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentId).toBeGreaterThan(0);
      expect(res.body.data.method).toBe('alipay_sandbox');
      expect(res.body.data.gatewayUrl).toMatch(/^\/checkout\?pid=\d+$/);
      expect(res.body.data.debugSignatures.success).toMatch(/^[a-f0-9]{64}$/);

      const payment = await Payment.findByPk(res.body.data.paymentId);
      expect(payment!.get('status')).toBe(PAYMENT_STATUS.PENDING);
      expect(Number(payment!.get('amount'))).toBe(59);
    });

    it('cancels a prior pending intent when a new one is opened', async () => {
      const first = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'alipay_sandbox' });
      const firstId = first.body.data.paymentId as number;

      const second = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'wechat_sandbox' });
      expect(second.status).toBe(201);

      const refreshed = await Payment.findByPk(firstId);
      expect(refreshed!.get('status')).toBe(PAYMENT_STATUS.CANCELLED);
    });

    it('rejects pay-intent on a non-pending order', async () => {
      // Drive the order to 已支付 via the legacy flip so the next pay-intent must refuse.
      await request(getApp()).put(`/api/orders/${orderId}/pay`).set(...me.authHeader);

      const res = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'alipay_sandbox' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('待支付');
    });

    it('returns 404 for another user\'s order', async () => {
      const other = await createUser();
      const res = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...other.authHeader)
        .send({ method: 'alipay_sandbox' });
      expect(res.status).toBe(404);
    });

    it('rejects unknown payment method', async () => {
      const res = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'bitcoin' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/payments/callback', () => {
    async function openIntent(): Promise<{ paymentId: number; amount: number }> {
      const res = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'alipay_sandbox' });
      return { paymentId: res.body.data.paymentId, amount: res.body.data.amount };
    }

    it('success outcome flips both payment and order state', async () => {
      const { paymentId, amount } = await openIntent();
      const res = await request(getApp()).post('/api/payments/callback').send({
        paymentId,
        outcome: 'success',
        amount,
        signature: signPayment(paymentId, 'success', amount),
      });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(PAYMENT_STATUS.SUCCESS);
      expect(res.body.data.orderStatus).toBe(ORDER_STATUS.PAID);
      expect(res.body.data.gatewayTxId).toMatch(/^SBX\d+/);

      const order = await Order.findByPk(orderId);
      expect(order!.get('status')).toBe(ORDER_STATUS.PAID);
    });

    it('failed outcome leaves order in 待支付', async () => {
      const { paymentId, amount } = await openIntent();
      await request(getApp()).post('/api/payments/callback').send({
        paymentId,
        outcome: 'failed',
        amount,
        signature: signPayment(paymentId, 'failed', amount),
      });

      const payment = await Payment.findByPk(paymentId);
      expect(payment!.get('status')).toBe(PAYMENT_STATUS.FAILED);
      const order = await Order.findByPk(orderId);
      expect(order!.get('status')).toBe(ORDER_STATUS.PENDING);
    });

    it('cancelled outcome leaves order in 待支付', async () => {
      const { paymentId, amount } = await openIntent();
      await request(getApp()).post('/api/payments/callback').send({
        paymentId,
        outcome: 'cancelled',
        amount,
        signature: signPayment(paymentId, 'cancelled', amount),
      });

      const payment = await Payment.findByPk(paymentId);
      expect(payment!.get('status')).toBe(PAYMENT_STATUS.CANCELLED);
    });

    it('rejects a tampered signature', async () => {
      const { paymentId, amount } = await openIntent();
      const res = await request(getApp()).post('/api/payments/callback').send({
        paymentId,
        outcome: 'success',
        amount,
        signature: 'f'.repeat(64),
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('签名');
    });

    it('rejects amount tampering even if the signature matches', async () => {
      const { paymentId } = await openIntent();
      const forgedAmount = 1; // signer knows the right shape but the amount on file is 59
      const res = await request(getApp()).post('/api/payments/callback').send({
        paymentId,
        outcome: 'success',
        amount: forgedAmount,
        signature: signPayment(paymentId, 'success', forgedAmount),
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('金额');
    });

    it('refuses to process the same payment twice (replay)', async () => {
      const { paymentId, amount } = await openIntent();
      const first = await request(getApp()).post('/api/payments/callback').send({
        paymentId,
        outcome: 'success',
        amount,
        signature: signPayment(paymentId, 'success', amount),
      });
      expect(first.status).toBe(200);

      const second = await request(getApp()).post('/api/payments/callback').send({
        paymentId,
        outcome: 'success',
        amount,
        signature: signPayment(paymentId, 'success', amount),
      });
      expect(second.status).toBe(409);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('owner can read, strangers cannot', async () => {
      const intent = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'alipay_sandbox' });
      const paymentId = intent.body.data.paymentId;

      const mine = await request(getApp()).get(`/api/payments/${paymentId}`).set(...me.authHeader);
      expect(mine.status).toBe(200);
      expect(mine.body.data.status).toBe(PAYMENT_STATUS.PENDING);

      const other = await createUser();
      const theirs = await request(getApp()).get(`/api/payments/${paymentId}`).set(...other.authHeader);
      expect(theirs.status).toBe(404);
    });
  });

  describe('GET /api/orders/:orderId/payments', () => {
    it('lists the caller\'s payment history for an order newest-first', async () => {
      const a = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'alipay_sandbox' });
      const b = await request(getApp())
        .post(`/api/orders/${orderId}/pay-intent`)
        .set(...me.authHeader)
        .send({ method: 'wechat_sandbox' });

      const list = await request(getApp()).get(`/api/orders/${orderId}/payments`).set(...me.authHeader);
      expect(list.status).toBe(200);
      const ids = list.body.data.map((p: { id: number }) => p.id);
      expect(ids).toEqual([b.body.data.paymentId, a.body.data.paymentId]);
    });
  });
});
