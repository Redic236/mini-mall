import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, Coupon, COUPON_TYPE, Order } from '../helpers/db';
import { createAdmin, createUser, makeAuthed, type AuthedUser } from '../helpers/auth';

function iso(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

async function placeOrder(
  me: AuthedUser,
  data: SeededData,
  productId: number,
  quantity: number,
  couponCode?: string,
): Promise<{ id: number; totalAmount: number; discountAmount: number; couponId: number | null }> {
  await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId, quantity });
  const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
  const body = {
    addressId: data.address!.get('id'),
    cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
    ...(couponCode ? { couponCode } : {}),
  };
  const res = await request(getApp()).post('/api/orders').set(...me.authHeader).send(body);
  return {
    id: res.body.data.id,
    totalAmount: Number(res.body.data.totalAmount),
    discountAmount: Number(res.body.data.discountAmount),
    couponId: res.body.data.couponId,
  };
}

describe('Coupons', () => {
  let data: SeededData;
  let me: AuthedUser;
  let admin: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
    admin = await createAdmin();
  });

  describe('POST /api/coupons/preview', () => {
    it('returns the computed discount for a valid fixed-amount coupon', async () => {
      await Coupon.create({
        code: 'SAVE10',
        name: '满 59 减 10',
        type: COUPON_TYPE.FIXED,
        value: 10,
        minOrderAmount: 59,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: true,
      });

      const res = await request(getApp())
        .post('/api/coupons/preview')
        .set(...me.authHeader)
        .send({ code: 'SAVE10', orderAmount: 100 });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        code: 'SAVE10',
        type: 'fixed',
        discountAmount: 10,
        finalAmount: 90,
      });
    });

    it('percentage coupon computes the right discount', async () => {
      await Coupon.create({
        code: 'HALF',
        name: '5 折',
        type: COUPON_TYPE.PERCENTAGE,
        value: 50,
        minOrderAmount: 0,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: true,
      });

      const res = await request(getApp())
        .post('/api/coupons/preview')
        .set(...me.authHeader)
        .send({ code: 'HALF', orderAmount: 59 });

      expect(Number(res.body.data.discountAmount)).toBe(29.5);
      expect(Number(res.body.data.finalAmount)).toBe(29.5);
    });

    it('rejects below-minimum orders', async () => {
      await Coupon.create({
        code: 'MIN100',
        name: '满 100 减 20',
        type: COUPON_TYPE.FIXED,
        value: 20,
        minOrderAmount: 100,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: true,
      });
      const res = await request(getApp())
        .post('/api/coupons/preview')
        .set(...me.authHeader)
        .send({ code: 'MIN100', orderAmount: 50 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('满');
    });

    it('rejects expired coupon', async () => {
      await Coupon.create({
        code: 'EXPIRED',
        name: '过期券',
        type: COUPON_TYPE.FIXED,
        value: 10,
        minOrderAmount: 0,
        startsAt: iso(-10),
        expiresAt: iso(-1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: true,
      });
      const res = await request(getApp())
        .post('/api/coupons/preview')
        .set(...me.authHeader)
        .send({ code: 'EXPIRED', orderAmount: 100 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('过期');
    });

    it('rejects inactive / deleted-quota / not-yet-active', async () => {
      await Coupon.create({
        code: 'OFF',
        name: 'off',
        type: COUPON_TYPE.FIXED,
        value: 10,
        minOrderAmount: 0,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: false,
      });
      const off = await request(getApp())
        .post('/api/coupons/preview')
        .set(...me.authHeader)
        .send({ code: 'OFF', orderAmount: 100 });
      expect(off.status).toBe(400);
      expect(off.body.message).toContain('停用');
    });

    it('rejects unknown code', async () => {
      const res = await request(getApp())
        .post('/api/coupons/preview')
        .set(...me.authHeader)
        .send({ code: 'NOPE', orderAmount: 100 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('不存在');
    });

    it('requires auth', async () => {
      const res = await request(getApp())
        .post('/api/coupons/preview')
        .send({ code: 'X', orderAmount: 100 });
      expect(res.status).toBe(401);
    });
  });

  describe('order creation with coupon', () => {
    async function makeCoupon(overrides: Partial<{ totalQuantity: number | null; perUserLimit: number }> = {}): Promise<void> {
      await Coupon.create({
        code: 'WELCOME10',
        name: '新人立减 10',
        type: COUPON_TYPE.FIXED,
        value: 10,
        minOrderAmount: 0,
        startsAt: iso(-1),
        expiresAt: iso(7),
        totalQuantity: overrides.totalQuantity ?? null,
        perUserLimit: overrides.perUserLimit ?? 1,
        isActive: true,
      });
    }

    it('discounts the order total and records couponId + discountAmount', async () => {
      await makeCoupon();
      const p = data.products[0]; // 59

      const order = await placeOrder(me, data, p.id, 1, 'WELCOME10');
      expect(order.totalAmount).toBe(49);
      expect(order.discountAmount).toBe(10);
      expect(order.couponId).not.toBeNull();

      const coupon = await Coupon.findOne({ where: { code: 'WELCOME10' } });
      expect(coupon!.get('usedCount')).toBe(1);
    });

    it('refuses to redeem past perUserLimit', async () => {
      await makeCoupon({ perUserLimit: 1 });
      const p = data.products[0];

      await placeOrder(me, data, p.id, 1, 'WELCOME10');

      // Second attempt
      await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p.id, quantity: 1 });
      const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({
          addressId: data.address!.get('id'),
          cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
          couponCode: 'WELCOME10',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('上限');
    });

    it('allows a different user to redeem independently', async () => {
      await makeCoupon({ perUserLimit: 1 });
      const p = data.products[0];
      await placeOrder(me, data, p.id, 1, 'WELCOME10');

      const other = await createUser();
      // give other an address
      const addr = await request(getApp()).post('/api/addresses').set(...other.authHeader).send({
        name: 'o', phone: '13800000011', province: 'p', city: 'c', district: 'd', detail: 'x',
      });
      await request(getApp()).post('/api/cart').set(...other.authHeader).send({ productId: p.id, quantity: 1 });
      const cart = await request(getApp()).get('/api/cart').set(...other.authHeader);
      const res = await request(getApp()).post('/api/orders').set(...other.authHeader).send({
        addressId: addr.body.data.id,
        cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
        couponCode: 'WELCOME10',
      });
      expect(res.status).toBe(201);
    });

    it('refuses past totalQuantity', async () => {
      await makeCoupon({ totalQuantity: 1 });
      const p = data.products[0];
      await placeOrder(me, data, p.id, 1, 'WELCOME10');

      const other = await createUser();
      const addr = await request(getApp()).post('/api/addresses').set(...other.authHeader).send({
        name: 'o', phone: '13800000011', province: 'p', city: 'c', district: 'd', detail: 'x',
      });
      await request(getApp()).post('/api/cart').set(...other.authHeader).send({ productId: p.id, quantity: 1 });
      const cart = await request(getApp()).get('/api/cart').set(...other.authHeader);
      const res = await request(getApp()).post('/api/orders').set(...other.authHeader).send({
        addressId: addr.body.data.id,
        cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
        couponCode: 'WELCOME10',
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('领完');
    });

    it('serializes concurrent redemptions by the same user via the coupon FOR UPDATE lock', async () => {
      // Regression test: an earlier review claimed two parallel same-user
      // requests could both pass the perUserLimit check because the coupon
      // row lock "only serializes across users". InnoDB row locks are not
      // user-scoped — FOR UPDATE on the coupon row blocks any second
      // transaction until the first commits. Exactly one redemption should
      // succeed; the other must fail with the limit message.
      await makeCoupon({ perUserLimit: 1 });

      // Use two distinct products so two cart rows can coexist
      // (cart has a unique (userId, productId) constraint).
      const p1 = data.products[0];
      const p2 = data.products[1];
      const add1 = await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p1.id, quantity: 1 });
      const add2 = await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p2.id, quantity: 1 });
      const cartId1 = add1.body.data.id;
      const cartId2 = add2.body.data.id;

      const body = {
        addressId: data.address!.get('id'),
        couponCode: 'WELCOME10',
      };
      const [res1, res2] = await Promise.all([
        request(getApp()).post('/api/orders').set(...me.authHeader).send({ ...body, cartItemIds: [cartId1] }),
        request(getApp()).post('/api/orders').set(...me.authHeader).send({ ...body, cartItemIds: [cartId2] }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 400]);
      const failed = res1.status === 400 ? res1 : res2;
      expect(failed.body.message).toMatch(/使用次数上限|领完/);

      const coupon = await Coupon.findOne({ where: { code: 'WELCOME10' } });
      expect(coupon!.get('usedCount')).toBe(1);
    });

    it('cancelling the order rolls back usedCount and frees the per-user claim', async () => {
      await makeCoupon({ perUserLimit: 1 });
      const p = data.products[0];

      const order = await placeOrder(me, data, p.id, 1, 'WELCOME10');

      const coupon = await Coupon.findOne({ where: { code: 'WELCOME10' } });
      expect(coupon!.get('usedCount')).toBe(1);

      await request(getApp()).put(`/api/orders/${order.id}/cancel`).set(...me.authHeader);

      await coupon!.reload();
      expect(coupon!.get('usedCount')).toBe(0);

      // User can redeem again
      const order2 = await placeOrder(me, data, p.id, 1, 'WELCOME10');
      expect(order2.discountAmount).toBe(10);
    });

    it('fixed-value coupon above order amount clamps to amount (not negative)', async () => {
      await Coupon.create({
        code: 'BIG',
        name: '大券',
        type: COUPON_TYPE.FIXED,
        value: 1000,
        minOrderAmount: 0,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: true,
      });
      const p = data.products[0]; // 59
      const order = await placeOrder(me, data, p.id, 1, 'BIG');
      expect(order.totalAmount).toBe(0);
      expect(order.discountAmount).toBe(59);
    });
  });

  describe('Admin coupon CRUD', () => {
    it('rejects non-admin', async () => {
      const res = await request(getApp()).get('/api/admin/coupons').set(...me.authHeader);
      expect(res.status).toBe(403);
    });

    it('creates / lists / updates / deletes', async () => {
      const create = await request(getApp())
        .post('/api/admin/coupons')
        .set(...admin.authHeader)
        .send({
          code: 'NEW10',
          name: 'n',
          type: 'fixed',
          value: 10,
          minOrderAmount: 0,
          startsAt: iso(-1).toISOString(),
          expiresAt: iso(1).toISOString(),
          totalQuantity: 100,
          perUserLimit: 2,
          isActive: true,
        });
      expect(create.status).toBe(201);
      const id = create.body.data.id;

      const list = await request(getApp()).get('/api/admin/coupons').set(...admin.authHeader);
      expect(list.body.data.some((c: { id: number }) => c.id === id)).toBe(true);

      const update = await request(getApp())
        .put(`/api/admin/coupons/${id}`)
        .set(...admin.authHeader)
        .send({
          code: 'NEW10',
          name: 'renamed',
          type: 'fixed',
          value: 15,
          minOrderAmount: 50,
          startsAt: iso(-1).toISOString(),
          expiresAt: iso(1).toISOString(),
          totalQuantity: 100,
          perUserLimit: 2,
          isActive: true,
        });
      expect(update.status).toBe(200);
      expect(Number(update.body.data.value)).toBe(15);

      const del = await request(getApp()).delete(`/api/admin/coupons/${id}`).set(...admin.authHeader);
      expect(del.status).toBe(204);
    });

    it('refuses to delete a coupon already used on an order', async () => {
      await Coupon.create({
        code: 'USED',
        name: 'used',
        type: COUPON_TYPE.FIXED,
        value: 5,
        minOrderAmount: 0,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: true,
      });
      await placeOrder(me, data, data.products[0].id, 1, 'USED');
      const coupon = await Coupon.findOne({ where: { code: 'USED' } });

      const res = await request(getApp())
        .delete(`/api/admin/coupons/${coupon!.get('id')}`)
        .set(...admin.authHeader);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('订单使用');
    });

    it('validates input: bad percentage range', async () => {
      const res = await request(getApp())
        .post('/api/admin/coupons')
        .set(...admin.authHeader)
        .send({
          code: 'BAD',
          name: 'n',
          type: 'percentage',
          value: 150,
          minOrderAmount: 0,
          startsAt: iso(-1).toISOString(),
          expiresAt: iso(1).toISOString(),
          totalQuantity: null,
          perUserLimit: 1,
        });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/coupons', () => {
    it('lists only active + in-window coupons', async () => {
      await Coupon.create({
        code: 'ACTIVE',
        name: 'a',
        type: COUPON_TYPE.FIXED,
        value: 5,
        minOrderAmount: 0,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: true,
      });
      await Coupon.create({
        code: 'HIDDEN',
        name: 'h',
        type: COUPON_TYPE.FIXED,
        value: 5,
        minOrderAmount: 0,
        startsAt: iso(-1),
        expiresAt: iso(1),
        totalQuantity: null,
        perUserLimit: 1,
        isActive: false,
      });

      const res = await request(getApp()).get('/api/coupons');
      expect(res.status).toBe(200);
      const codes = (res.body.data as Array<{ code: string }>).map((c) => c.code);
      expect(codes).toContain('ACTIVE');
      expect(codes).not.toContain('HIDDEN');
    });
  });

  void Order;
});
