import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, Address, Product } from '../helpers/db';
import { createAdmin, createUser, makeAuthed, type AuthedUser } from '../helpers/auth';

async function addToCart(authHeader: [string, string], productId: number, quantity: number): Promise<number> {
  const res = await request(getApp()).post('/api/cart').set(...authHeader).send({ productId, quantity });
  return res.body.data.id as number;
}

describe('Orders API', () => {
  let data: SeededData;
  let me: AuthedUser;
  let cartId1: number;
  let cartId2: number;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
    cartId1 = await addToCart(me.authHeader, data.products[0].id, 2); // 2 x 59 = 118
    cartId2 = await addToCart(me.authHeader, data.products[1].id, 1); // 1 x 199 = 199
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(getApp()).get('/api/orders');
    expect(res.status).toBe(401);
  });

  describe('POST /api/orders', () => {
    it('creates an order with orderNo and correct total', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1, cartId2] });

      expect(res.status).toBe(201);
      expect(res.body.data.orderNo).toMatch(/^ORD\d{23}$/);
      expect(Number(res.body.data.totalAmount)).toBe(118 + 199);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.status).toBe('待支付');
    });

    it('snapshots the shipping address at order time', async () => {
      const addr = data.address!;
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: addr.get('id'), cartItemIds: [cartId1] });

      expect(res.status).toBe(201);
      expect(res.body.data.receiverName).toBe(addr.get('name'));
      expect(res.body.data.receiverPhone).toBe(addr.get('phone'));
      expect(res.body.data.province).toBe(addr.get('province'));
      expect(res.body.data.city).toBe(addr.get('city'));
      expect(res.body.data.district).toBe(addr.get('district'));
      expect(res.body.data.detailAddress).toBe(addr.get('detail'));
    });

    it('snapshot survives subsequent edits of the source address', async () => {
      const addr = data.address!;
      const original = {
        name: addr.get('name'),
        phone: addr.get('phone'),
        province: addr.get('province'),
        city: addr.get('city'),
        district: addr.get('district'),
        detail: addr.get('detail'),
      };

      const created = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: addr.get('id'), cartItemIds: [cartId1] });
      expect(created.status).toBe(201);

      await Address.update(
        { name: '李四', phone: '13900000099', province: '上海', city: '上海', district: '浦东', detail: 'B2 路' },
        { where: { id: addr.get('id') } },
      );

      const refetch = await request(getApp())
        .get(`/api/orders/${created.body.data.id}`)
        .set(...me.authHeader);
      expect(refetch.body.data.receiverName).toBe(original.name);
      expect(refetch.body.data.receiverPhone).toBe(original.phone);
      expect(refetch.body.data.province).toBe(original.province);
      expect(refetch.body.data.city).toBe(original.city);
      expect(refetch.body.data.district).toBe(original.district);
      expect(refetch.body.data.detailAddress).toBe(original.detail);
    });

    it('snapshots the product price at order time', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const item = res.body.data.items[0];
      expect(Number(item.price)).toBe(59);

      await Product.update({ price: 999 }, { where: { id: data.products[0].id } });

      const refetch = await request(getApp()).get(`/api/orders/${res.body.data.id}`).set(...me.authHeader);
      expect(Number(refetch.body.data.items[0].price)).toBe(59);
    });

    it('deducts stock and clears the selected cart items', async () => {
      const p1Id = data.products[0].id;
      const p2Id = data.products[1].id;

      await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1, cartId2] });

      const p1 = await Product.findByPk(p1Id);
      const p2 = await Product.findByPk(p2Id);
      expect(Number(p1!.get('stock'))).toBe(100 - 2);
      expect(Number(p2!.get('stock'))).toBe(50 - 1);

      const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
      expect(cart.body.data.items).toHaveLength(0);
    });

    it('rejects when stock is insufficient', async () => {
      await Product.update({ stock: 1 }, { where: { id: data.products[0].id } });
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('库存不足');
    });

    it('rolls back the entire transaction when one item fails', async () => {
      await Product.update({ stock: 0 }, { where: { id: data.products[1].id } });

      const before = await Product.findByPk(data.products[0].id);
      const stockBefore = Number(before!.get('stock'));

      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1, cartId2] });
      expect(res.status).toBe(400);

      const after = await Product.findByPk(data.products[0].id);
      expect(Number(after!.get('stock'))).toBe(stockBefore);

      const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
      expect(cart.body.data.items).toHaveLength(2);
    });

    it('rejects unknown address', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: 99999, cartItemIds: [cartId1] });
      expect(res.status).toBe(400);
    });

    it('rejects empty cartItemIds', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [] });
      expect(res.status).toBe(400);
    });

    it('rejects cart items belonging to another user', async () => {
      const other = await createUser();
      const otherCartId = await addToCart(other.authHeader, data.products[0].id, 1);

      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [otherCartId] });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('部分购物车项');
    });

    it('rejects another user\'s address', async () => {
      const other = await createUser();
      const otherAddr = await request(getApp())
        .post('/api/addresses')
        .set(...other.authHeader)
        .send({
          name: 'x', phone: '13800000002', province: 'a', city: 'b', district: 'c', detail: 'd',
        });

      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: otherAddr.body.data.id, cartItemIds: [cartId1] });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('lists the caller\'s orders only', async () => {
      await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const other = await createUser();
      const listOther = await request(getApp()).get('/api/orders').set(...other.authHeader);
      expect(listOther.body.data).toHaveLength(0);

      const listMine = await request(getApp()).get('/api/orders').set(...me.authHeader);
      expect(listMine.body.data).toHaveLength(1);
    });

    it('filters by status', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });
      await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`).set(...me.authHeader);

      const pending = await request(getApp()).get('/api/orders?status=待支付').set(...me.authHeader);
      const cancelled = await request(getApp()).get('/api/orders?status=已取消').set(...me.authHeader);
      expect(pending.body.data).toHaveLength(0);
      expect(cancelled.body.data).toHaveLength(1);
    });

    it('rejects unknown status', async () => {
      const res = await request(getApp()).get('/api/orders?status=nope').set(...me.authHeader);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('returns order with items and address', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const res = await request(getApp()).get(`/api/orders/${created.body.data.id}`).set(...me.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.address).not.toBeNull();
    });

    it('returns 404 when viewing another user\'s order', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const other = await createUser();
      const res = await request(getApp()).get(`/api/orders/${created.body.data.id}`).set(...other.authHeader);
      expect(res.status).toBe(404);
    });

    it('returns 404 when missing', async () => {
      const res = await request(getApp()).get('/api/orders/99999').set(...me.authHeader);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('cancels pending order and restores stock', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const res = await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`).set(...me.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('已取消');

      const p1 = await Product.findByPk(data.products[0].id);
      expect(Number(p1!.get('stock'))).toBe(100);
    });

    it('rejects cancelling a non-pending order', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });
      await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`).set(...me.authHeader);

      const res = await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`).set(...me.authHeader);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('只能取消待支付');
    });

    it('returns 404 for missing order', async () => {
      const res = await request(getApp()).put('/api/orders/99999/cancel').set(...me.authHeader);
      expect(res.status).toBe(404);
    });
  });

  describe('Order state transitions (pay / ship / confirm)', () => {
    async function createOrder(): Promise<number> {
      const res = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });
      return res.body.data.id as number;
    }

    it('walks 待支付 -> 已支付 -> 已发货 -> 已完成', async () => {
      const id = await createOrder();
      const admin = await createAdmin();

      const paid = await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      expect(paid.status).toBe(200);
      expect(paid.body.data.status).toBe('已支付');

      const shipped = await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...admin.authHeader);
      expect(shipped.status).toBe(200);
      expect(shipped.body.data.status).toBe('已发货');

      const done = await request(getApp()).put(`/api/orders/${id}/confirm`).set(...me.authHeader);
      expect(done.status).toBe(200);
      expect(done.body.data.status).toBe('已完成');
    });

    it('admin ship rejects a 待支付 order (not yet paid)', async () => {
      const id = await createOrder();
      const admin = await createAdmin();
      const res = await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...admin.authHeader);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已支付');
    });

    it('non-admin ship endpoint returns 403', async () => {
      const id = await createOrder();
      await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      const res = await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...me.authHeader);
      expect(res.status).toBe(403);
    });

    it('rejects confirm before ship', async () => {
      const id = await createOrder();
      await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      const res = await request(getApp()).put(`/api/orders/${id}/confirm`).set(...me.authHeader);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已支付');
    });

    it('rejects pay on a cancelled order', async () => {
      const id = await createOrder();
      await request(getApp()).put(`/api/orders/${id}/cancel`).set(...me.authHeader);
      const res = await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('已取消');
    });

    it('rejects cancel after payment', async () => {
      const id = await createOrder();
      await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      const res = await request(getApp()).put(`/api/orders/${id}/cancel`).set(...me.authHeader);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('只能取消待支付');
    });

    it('rejects pay on completed order', async () => {
      const id = await createOrder();
      const admin = await createAdmin();
      await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...admin.authHeader);
      await request(getApp()).put(`/api/orders/${id}/confirm`).set(...me.authHeader);
      const res = await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      expect(res.status).toBe(400);
    });

    it('returns 404 for another user\'s order on pay/confirm', async () => {
      const id = await createOrder();
      const other = await createUser();
      for (const action of ['pay', 'confirm']) {
        const res = await request(getApp()).put(`/api/orders/${id}/${action}`).set(...other.authHeader);
        expect(res.status).toBe(404);
      }
    });

    it('does not restore stock on forward transitions', async () => {
      const id = await createOrder();
      const admin = await createAdmin();
      const stockBefore = Number((await Product.findByPk(data.products[0].id))!.get('stock'));

      await request(getApp()).put(`/api/orders/${id}/pay`).set(...me.authHeader);
      await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...admin.authHeader);
      await request(getApp()).put(`/api/orders/${id}/confirm`).set(...me.authHeader);

      const stockAfter = Number((await Product.findByPk(data.products[0].id))!.get('stock'));
      expect(stockAfter).toBe(stockBefore);
    });
  });
});
