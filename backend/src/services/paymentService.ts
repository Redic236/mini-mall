import { Op, Transaction } from 'sequelize';
import { Order, ORDER_STATUS, Payment, PAYMENT_STATUS } from '../models';
import type { PaymentMethod } from '../models';
import { sequelize } from '../config/database';
import { HttpError } from '../utils/apiResponse';
import { audit } from '../utils/audit';
import {
  generateGatewayTxId,
  signPayment,
  verifyPaymentSignature,
  type PaymentOutcome,
} from '../utils/paymentSignature';

export interface PayIntentResult {
  paymentId: number;
  amount: number;
  method: PaymentMethod;
  gatewayUrl: string;
  // Echoed so the fake gateway page can sign without hitting the server
  // again. In a real integration the client would never see this — the
  // signature is produced by the gateway backend. Sandbox-only convenience.
  debugSignatures: Record<PaymentOutcome, string>;
}

/**
 * Create a fresh Payment row against a 待支付 order and hand the caller the
 * gateway URL to redirect the browser to. Multiple pay attempts are allowed:
 * if a user abandons one checkout and starts another, the previous pending
 * row is cancelled so only one intent is open at a time.
 */
export async function createPayIntent(
  userId: number,
  orderId: number,
  method: PaymentMethod,
): Promise<PayIntentResult> {
  return sequelize.transaction(async (t) => {
    const order = await Order.findOne({
      where: { id: orderId, userId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!order) throw new HttpError(404, '订单不存在');
    if ((order.get('status') as string) !== ORDER_STATUS.PENDING) {
      throw new HttpError(400, '只能对待支付的订单发起支付');
    }

    // Cancel any other open payment intents for this order so we never have
    // two "pending" rows racing each other.
    await Payment.update(
      { status: PAYMENT_STATUS.CANCELLED },
      {
        where: { orderId, status: PAYMENT_STATUS.PENDING },
        transaction: t,
      },
    );

    const amount = Number(order.get('totalAmount'));
    const payment = await Payment.create(
      {
        orderId,
        userId,
        method,
        amount,
      },
      { transaction: t },
    );
    const paymentId = payment.get('id') as number;

    audit({
      event: 'payment.intent',
      entity: 'order',
      entityId: orderId,
      details: { userId, paymentId, method, amount },
    });

    return {
      paymentId,
      amount,
      method,
      gatewayUrl: `/checkout?pid=${paymentId}`,
      debugSignatures: {
        success: signPayment(paymentId, 'success', amount),
        failed: signPayment(paymentId, 'failed', amount),
        cancelled: signPayment(paymentId, 'cancelled', amount),
      },
    };
  });
}

export interface CallbackInput {
  paymentId: number;
  outcome: PaymentOutcome;
  amount: number;
  signature: string;
}

export interface CallbackResult {
  paymentId: number;
  status: string;
  orderId: number;
  orderStatus: string;
  gatewayTxId: string | null;
}

/**
 * Gateway → us callback. Verifies the HMAC signature, refuses replays
 * (payment must still be pending), refuses amount tampering, then
 * atomically terminalises the payment and bumps the order status for a
 * successful outcome.
 */
export async function handleGatewayCallback(input: CallbackInput): Promise<CallbackResult> {
  if (!verifyPaymentSignature(input.paymentId, input.outcome, input.amount, input.signature)) {
    throw new HttpError(400, '签名校验失败');
  }

  return sequelize.transaction(async (t) => {
    const payment = await Payment.findOne({
      where: { id: input.paymentId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!payment) throw new HttpError(404, '支付流水不存在');

    const currentStatus = payment.get('status') as string;
    if (currentStatus !== PAYMENT_STATUS.PENDING) {
      throw new HttpError(409, '该支付已被处理，请勿重复回调');
    }

    // DECIMAL(10,2) on both sides — compare by cents to dodge any
    // floating-point slack. The previous 0.001 tolerance was looser than the
    // schema's own precision, so it was only ever protecting against imagined
    // rounding that can't actually happen on these columns.
    const expectedCents = Math.round(Number(payment.get('amount')) * 100);
    const inputCents = Math.round(input.amount * 100);
    if (expectedCents !== inputCents) {
      throw new HttpError(400, '支付金额不匹配');
    }

    const orderId = payment.get('orderId') as number;

    await applyCallbackToPayment(payment, input.outcome, t);

    if (input.outcome === 'success') {
      const order = await Order.findOne({
        where: { id: orderId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      // A concurrent cancel-expiry could have flipped the order off PENDING
      // between pay-intent and this callback. Surface it rather than silently
      // recording a successful payment on a cancelled order.
      if (!order) throw new HttpError(404, '订单不存在');
      const currentOrderStatus = order.get('status') as string;
      if (currentOrderStatus !== ORDER_STATUS.PENDING) {
        throw new HttpError(409, `订单当前状态为「${currentOrderStatus}」，无法完成支付`);
      }
      order.set('status', ORDER_STATUS.PAID);
      await order.save({ transaction: t });
    }

    const refreshed = await Payment.findOne({ where: { id: input.paymentId }, transaction: t });
    const order = await Order.findOne({ where: { id: orderId }, transaction: t });
    const finalStatus = refreshed!.get('status') as string;

    audit({
      event: 'payment.callback',
      entity: 'order',
      entityId: orderId,
      details: {
        paymentId: input.paymentId,
        outcome: input.outcome,
        amount: input.amount,
        paymentStatus: finalStatus,
        orderStatus: order!.get('status'),
      },
    });

    return {
      paymentId: input.paymentId,
      status: finalStatus,
      orderId,
      orderStatus: order!.get('status') as string,
      gatewayTxId: (refreshed!.get('gatewayTxId') as string | null) ?? null,
    };
  });
}

async function applyCallbackToPayment(
  payment: Payment,
  outcome: PaymentOutcome,
  transaction: Transaction,
): Promise<void> {
  if (outcome === 'success') {
    payment.set('status', PAYMENT_STATUS.SUCCESS);
    payment.set('gatewayTxId', generateGatewayTxId());
    payment.set('paidAt', new Date());
  } else if (outcome === 'failed') {
    payment.set('status', PAYMENT_STATUS.FAILED);
  } else {
    payment.set('status', PAYMENT_STATUS.CANCELLED);
  }
  await payment.save({ transaction });
}

export async function getPaymentForUser(userId: number, paymentId: number): Promise<Payment> {
  const payment = await Payment.findOne({ where: { id: paymentId, userId } });
  if (!payment) throw new HttpError(404, '支付流水不存在');
  return payment;
}

export async function listPaymentsForOrder(userId: number, orderId: number): Promise<Payment[]> {
  const order = await Order.findOne({ where: { id: orderId, userId } });
  if (!order) throw new HttpError(404, '订单不存在');
  return Payment.findAll({
    where: { orderId, userId },
    order: [['id', 'DESC']],
  });
}

export async function cleanupStalePendingPayments(olderThan: Date): Promise<number> {
  // Referenced by the expiry scheduler if we ever want to auto-cancel
  // abandoned payment intents; not wired yet but here to keep the domain
  // cohesive.
  const [affected] = await Payment.update(
    { status: PAYMENT_STATUS.CANCELLED },
    {
      where: {
        status: PAYMENT_STATUS.PENDING,
        createdAt: { [Op.lt]: olderThan },
      },
    },
  );
  return affected;
}
