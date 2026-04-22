import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, Product } from '../helpers/db';

async function addToCart(productId: number, quantity: number): Promise<number> {
  const res = await request(getApp()).post('/api/cart').send({ productId, quantity });
  return res.body.data.id as number;
}

describe('Orders API', () => {
  let data: SeededData;
  let cartId1: number;
  let cartId2: number;

  beforeEach(async () => {
    data = await seed();
    cartId1 = await addToCart(data.products[0].id, 2); // 2 x 59 = 118
    cartId2 = await addToCart(data.products[1].id, 1); // 1 x 199 = 199
  });

  describe('POST /api/orders', () => {
    it('creates an order with orderNo and correct total', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1, cartId2] });

      expect(res.status).toBe(201);
      expect(res.body.data.orderNo).toMatch(/^ORD\d{23}$/);
      expect(Number(res.body.data.totalAmount)).toBe(118 + 199);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.status).toBe('待支付');
    });

    it('snapshots the product price at order time', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const item = res.body.data.items[0];
      expect(Number(item.price)).toBe(59);

      // Change product price AFTER order. Re-fetching the order must still show 59.
      await Product.update({ price: 999 }, { where: { id: data.products[0].id } });

      const refetch = await request(getApp()).get(`/api/orders/${res.body.data.id}`);
      expect(Number(refetch.body.data.items[0].price)).toBe(59);
    });

    it('deducts stock and clears the selected cart items', async () => {
      const p1Id = data.products[0].id;
      const p2Id = data.products[1].id;

      await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1, cartId2] });

      const p1 = await Product.findByPk(p1Id);
      const p2 = await Product.findByPk(p2Id);
      expect(Number(p1!.get('stock'))).toBe(100 - 2);
      expect(Number(p2!.get('stock'))).toBe(50 - 1);

      const cart = await request(getApp()).get('/api/cart');
      expect(cart.body.data.items).toHaveLength(0);
    });

    it('rejects when stock is insufficient', async () => {
      await Product.update({ stock: 1 }, { where: { id: data.products[0].id } });
      const res = await request(getApp())
        .post('/api/orders')
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
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1, cartId2] });
      expect(res.status).toBe(400);

      const after = await Product.findByPk(data.products[0].id);
      expect(Number(after!.get('stock'))).toBe(stockBefore); // no partial deduction

      const cart = await request(getApp()).get('/api/cart');
      expect(cart.body.data.items).toHaveLength(2); // cart not cleared
    });

    it('rejects unknown address', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .send({ addressId: 99999, cartItemIds: [cartId1] });
      expect(res.status).toBe(400);
    });

    it('rejects empty cartItemIds', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [] });
      expect(res.status).toBe(400);
    });

    it('rejects unknown cart item ids', async () => {
      const res = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [99999] });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders', () => {
    it('lists orders', async () => {
      await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const res = await request(getApp()).get('/api/orders');
      expect(res.body.data).toHaveLength(1);
    });

    it('filters by status', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });
      await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`);

      const pending = await request(getApp()).get('/api/orders?status=待支付');
      const cancelled = await request(getApp()).get('/api/orders?status=已取消');
      expect(pending.body.data).toHaveLength(0);
      expect(cancelled.body.data).toHaveLength(1);
    });

    it('rejects unknown status', async () => {
      const res = await request(getApp()).get('/api/orders?status=nope');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('returns order with items and address', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const res = await request(getApp()).get(`/api/orders/${created.body.data.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.address).not.toBeNull();
    });

    it('returns 404 when missing', async () => {
      const res = await request(getApp()).get('/api/orders/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/orders/:id/cancel', () => {
    it('cancels pending order and restores stock', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });

      const res = await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('已取消');

      const p1 = await Product.findByPk(data.products[0].id);
      expect(Number(p1!.get('stock'))).toBe(100); // restored to original
    });

    it('rejects cancelling a non-pending order', async () => {
      const created = await request(getApp())
        .post('/api/orders')
        .send({ addressId: data.address!.get('id'), cartItemIds: [cartId1] });
      await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`);

      const res = await request(getApp()).put(`/api/orders/${created.body.data.id}/cancel`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('只能取消待支付');
    });

    it('returns 404 for missing order', async () => {
      const res = await request(getApp()).put('/api/orders/99999/cancel');
      expect(res.status).toBe(404);
    });
  });
});
