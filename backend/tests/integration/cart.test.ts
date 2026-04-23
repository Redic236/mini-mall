import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData } from '../helpers/db';
import { makeAuthed, type AuthedUser } from '../helpers/auth';

describe('Cart API', () => {
  let data: SeededData;
  let me: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(getApp()).get('/api/cart');
    expect(res.status).toBe(401);
  });

  describe('GET /api/cart', () => {
    it('returns empty summary when no items', async () => {
      const res = await request(getApp()).get('/api/cart').set(...me.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ items: [], totalPrice: 0, totalQuantity: 0 });
    });

    it('returns aggregated summary', async () => {
      const [p1, p2] = data.products;
      await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p1.id, quantity: 2 });
      await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p2.id, quantity: 1 });

      const res = await request(getApp()).get('/api/cart').set(...me.authHeader);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.totalPrice).toBe(2 * 59 + 1 * 199);
      expect(res.body.data.totalQuantity).toBe(3);
    });
  });

  describe('POST /api/cart', () => {
    it('creates a new cart item and returns a cart summary', async () => {
      const res = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, quantity: 2 });
      expect(res.status).toBe(201);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(2);
      expect(res.body.data.totalQuantity).toBe(2);
    });

    it('accumulates quantity for existing product', async () => {
      const p = data.products[0];
      await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p.id, quantity: 2 });
      await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p.id, quantity: 3 });

      const list = await request(getApp()).get('/api/cart').set(...me.authHeader);
      expect(list.body.data.items).toHaveLength(1);
      expect(list.body.data.items[0].quantity).toBe(5);
    });

    it('rejects quantity exceeding stock', async () => {
      const p = data.products[2];
      const res = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: p.id, quantity: 999 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('库存不足');
    });

    it('rejects cumulative quantity exceeding stock', async () => {
      const p = data.products[2];
      await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p.id, quantity: 6 });
      const res = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: p.id, quantity: 6 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('库存不足');
    });

    it('rejects invalid quantity', async () => {
      const res = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, quantity: 0 });
      expect(res.status).toBe(400);
    });

    it('returns 404 when product missing', async () => {
      const res = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: 99999, quantity: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/cart/:id', () => {
    it('updates quantity and returns the refreshed summary', async () => {
      const add = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, quantity: 1 });
      const id = add.body.data.items[0].id;

      const res = await request(getApp()).put(`/api/cart/${id}`).set(...me.authHeader).send({ quantity: 5 });
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(5);
      expect(res.body.data.totalQuantity).toBe(5);
    });

    it('rejects quantity exceeding stock', async () => {
      const add = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: data.products[2].id, quantity: 1 });
      const id = add.body.data.items[0].id;

      const res = await request(getApp()).put(`/api/cart/${id}`).set(...me.authHeader).send({ quantity: 999 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('库存不足');
    });

    it('returns 404 when item missing', async () => {
      const res = await request(getApp()).put('/api/cart/99999').set(...me.authHeader).send({ quantity: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/cart/:id', () => {
    it('removes the cart item and returns the refreshed summary', async () => {
      const add = await request(getApp())
        .post('/api/cart')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, quantity: 1 });
      const id = add.body.data.items[0].id;

      const res = await request(getApp()).delete(`/api/cart/${id}`).set(...me.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.totalQuantity).toBe(0);
    });

    it('returns 404 when item missing', async () => {
      const res = await request(getApp()).delete('/api/cart/99999').set(...me.authHeader);
      expect(res.status).toBe(404);
    });
  });
});
