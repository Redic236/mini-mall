import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, Product, Order, ORDER_STATUS } from '../helpers/db';
import { makeAuthed, type AuthedUser } from '../helpers/auth';
import { expirePendingOrders } from '../../src/services/orderService';

async function addToCart(me: AuthedUser, productId: number, quantity: number): Promise<number> {
  const res = await request(getApp())
    .post('/api/cart')
    .set(...me.authHeader)
    .send({ productId, quantity });
  const items = (res.body.data.items ?? []) as Array<{ id: number; productId: number }>;
  const match = items.find((it) => it.productId === productId);
  if (!match) throw new Error(`addToCart: productId ${productId} not in cart`);
  return match.id;
}

async function placeOrder(me: AuthedUser, data: SeededData, cartItemIds: number[]): Promise<number> {
  const res = await request(getApp())
    .post('/api/orders')
    .set(...me.authHeader)
    .send({ addressId: data.address!.get('id'), cartItemIds });
  return res.body.data.id as number;
}

/**
 * Move an order's createdAt backwards by `minutesAgo` minutes so the expiry
 * scan sees it as stale. Bypasses `updatedAt` churn.
 */
async function backdateOrder(id: number, minutesAgo: number): Promise<void> {
  const when = new Date(Date.now() - minutesAgo * 60_000);
  await Order.update({ createdAt: when }, { where: { id }, silent: true });
}

describe('Order expiry (auto-cancel)', () => {
  let data: SeededData;
  let me: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
  });

  it('cancels stale pending orders and restores stock', async () => {
    const p = data.products[0];
    const stockBefore = Number((await Product.findByPk(p.id))!.get('stock'));

    const cartId = await addToCart(me, p.id, 2);
    const orderId = await placeOrder(me, data, [cartId]);

    // Stock is deducted on placement.
    const stockAfterPlace = Number((await Product.findByPk(p.id))!.get('stock'));
    expect(stockAfterPlace).toBe(stockBefore - 2);

    // Make it look old, then run the expiry pass with a cutoff in the past.
    await backdateOrder(orderId, 40);
    const cutoff = new Date(Date.now() - 30 * 60_000);
    const cancelled = await expirePendingOrders(cutoff);

    expect(cancelled).toContain(orderId);

    const order = await Order.findByPk(orderId);
    expect(order!.get('status')).toBe(ORDER_STATUS.CANCELLED);

    const stockAfterExpire = Number((await Product.findByPk(p.id))!.get('stock'));
    expect(stockAfterExpire).toBe(stockBefore);
  });

  it('leaves fresh pending orders alone', async () => {
    const cartId = await addToCart(me, data.products[0].id, 1);
    const orderId = await placeOrder(me, data, [cartId]);

    const cutoff = new Date(Date.now() - 30 * 60_000);
    const cancelled = await expirePendingOrders(cutoff);

    expect(cancelled).not.toContain(orderId);
    const order = await Order.findByPk(orderId);
    expect(order!.get('status')).toBe(ORDER_STATUS.PENDING);
  });

  it('skips orders already past 待支付 (paid / shipped / completed / cancelled)', async () => {
    const paidCart = await addToCart(me, data.products[0].id, 1);
    const paidId = await placeOrder(me, data, [paidCart]);
    await request(getApp()).put(`/api/orders/${paidId}/pay`).set(...me.authHeader);
    await backdateOrder(paidId, 60);

    const pendingCart = await addToCart(me, data.products[1].id, 1);
    const pendingId = await placeOrder(me, data, [pendingCart]);
    await backdateOrder(pendingId, 60);

    const cancelled = await expirePendingOrders(new Date(Date.now() - 30 * 60_000));

    expect(cancelled).toContain(pendingId);
    expect(cancelled).not.toContain(paidId);

    const paid = await Order.findByPk(paidId);
    expect(paid!.get('status')).toBe(ORDER_STATUS.PAID);
  });

  it('returns empty when nothing qualifies', async () => {
    const cancelled = await expirePendingOrders(new Date(Date.now() - 30 * 60_000));
    expect(cancelled).toEqual([]);
  });

  it('processes multiple stale orders in one pass', async () => {
    const p = data.products[0];
    const before = Number((await Product.findByPk(p.id))!.get('stock'));

    const c1 = await addToCart(me, p.id, 1);
    const o1 = await placeOrder(me, data, [c1]);
    await backdateOrder(o1, 40);

    // Fresh user so the second order is independent (cart scoped per user).
    const { makeAuthed, createUser } = await import('../helpers/auth');
    const me2 = await createUser();
    // Needs an address for that user before we can place an order.
    await request(getApp())
      .post('/api/addresses')
      .set(...me2.authHeader)
      .send({
        name: '测试',
        phone: '13800000000',
        province: '北京',
        city: '北京',
        district: '朝阳',
        detail: 'x',
        isDefault: true,
      });
    const addrList = await request(getApp()).get('/api/addresses').set(...me2.authHeader);
    const addrId2 = addrList.body.data[0].id;
    await request(getApp())
      .post('/api/cart')
      .set(...me2.authHeader)
      .send({ productId: p.id, quantity: 3 });
    const cart2 = await request(getApp()).get('/api/cart').set(...me2.authHeader);
    const r = await request(getApp())
      .post('/api/orders')
      .set(...me2.authHeader)
      .send({ addressId: addrId2, cartItemIds: [cart2.body.data.items[0].id] });
    const o2 = r.body.data.id as number;
    await backdateOrder(o2, 40);

    const cancelled = await expirePendingOrders(new Date(Date.now() - 30 * 60_000));
    expect(cancelled).toContain(o1);
    expect(cancelled).toContain(o2);

    const after = Number((await Product.findByPk(p.id))!.get('stock'));
    expect(after).toBe(before); // all stock returned

    // Silence unused-import complaint on some tsc configs
    void makeAuthed;
  });
});
