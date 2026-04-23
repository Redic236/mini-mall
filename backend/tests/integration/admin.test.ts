import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, Product } from '../helpers/db';
import { createAdmin, makeAuthed, type AuthedUser } from '../helpers/auth';

describe('Admin API', () => {
  let data: SeededData;
  let admin: AuthedUser;
  let regular: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    admin = await createAdmin();
    regular = await makeAuthed(data.user!);
  });

  describe('auth gating', () => {
    const cases = [
      ['GET', '/api/admin/stats'],
      ['GET', '/api/admin/orders'],
      ['PUT', '/api/admin/orders/1/ship'],
      ['GET', '/api/admin/products'],
      ['POST', '/api/admin/products'],
      ['PUT', '/api/admin/products/1'],
      ['DELETE', '/api/admin/products/1'],
    ] as const;

    for (const [method, path] of cases) {
      it(`${method} ${path} returns 401 without a token`, async () => {
        const res = await (request(getApp()) as unknown as {
          [k: string]: (path: string) => ReturnType<typeof request>;
        })[method.toLowerCase()](path);
        expect(res.status).toBe(401);
      });

      it(`${method} ${path} returns 403 for a non-admin user`, async () => {
        const res = await (request(getApp()) as unknown as {
          [k: string]: (path: string) => ReturnType<typeof request>;
        })[method.toLowerCase()](path).set(...regular.authHeader);
        expect(res.status).toBe(403);
      });
    }
  });

  describe('GET /api/admin/stats', () => {
    it('returns the tile numbers', async () => {
      const res = await request(getApp()).get('/api/admin/stats').set(...admin.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        totalOrders: expect.any(Number),
        totalRevenue: expect.any(Number),
        todayOrders: expect.any(Number),
        pendingShipmentCount: expect.any(Number),
        totalProducts: expect.any(Number),
        lowStockCount: expect.any(Number),
      });
      expect(res.body.data.totalProducts).toBe(3);
    });
  });

  describe('GET /api/admin/orders', () => {
    it('returns every user\'s orders with pagination meta', async () => {
      await request(getApp()).post('/api/cart').set(...regular.authHeader).send({ productId: data.products[0].id, quantity: 1 });
      const myCart = await request(getApp()).get('/api/cart').set(...regular.authHeader);
      await request(getApp()).post('/api/orders').set(...regular.authHeader).send({
        addressId: data.address!.get('id'),
        cartItemIds: myCart.body.data.items.map((it: { id: number }) => it.id),
      });

      const res = await request(getApp()).get('/api/admin/orders').set(...admin.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toMatchObject({ total: expect.any(Number), page: 1, limit: 20 });
    });

    it('filters by status', async () => {
      await request(getApp()).post('/api/cart').set(...regular.authHeader).send({ productId: data.products[0].id, quantity: 1 });
      const myCart = await request(getApp()).get('/api/cart').set(...regular.authHeader);
      await request(getApp()).post('/api/orders').set(...regular.authHeader).send({
        addressId: data.address!.get('id'),
        cartItemIds: myCart.body.data.items.map((it: { id: number }) => it.id),
      });

      const pending = await request(getApp()).get('/api/admin/orders?status=待支付').set(...admin.authHeader);
      expect(pending.body.data).toHaveLength(1);

      const paid = await request(getApp()).get('/api/admin/orders?status=已支付').set(...admin.authHeader);
      expect(paid.body.data).toHaveLength(0);
    });
  });

  describe('PUT /api/admin/orders/:id/ship', () => {
    async function createPaidOrder(): Promise<number> {
      await request(getApp()).post('/api/cart').set(...regular.authHeader).send({ productId: data.products[0].id, quantity: 1 });
      const cart = await request(getApp()).get('/api/cart').set(...regular.authHeader);
      const order = await request(getApp()).post('/api/orders').set(...regular.authHeader).send({
        addressId: data.address!.get('id'),
        cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
      });
      const id = order.body.data.id as number;
      await request(getApp()).put(`/api/orders/${id}/pay`).set(...regular.authHeader);
      return id;
    }

    it('flips a 已支付 order to 已发货', async () => {
      const id = await createPaidOrder();
      const res = await request(getApp()).put(`/api/admin/orders/${id}/ship`).set(...admin.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('已发货');
    });

    it('rejects shipping a 待支付 order', async () => {
      await request(getApp()).post('/api/cart').set(...regular.authHeader).send({ productId: data.products[0].id, quantity: 1 });
      const cart = await request(getApp()).get('/api/cart').set(...regular.authHeader);
      const order = await request(getApp()).post('/api/orders').set(...regular.authHeader).send({
        addressId: data.address!.get('id'),
        cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
      });
      const res = await request(getApp()).put(`/api/admin/orders/${order.body.data.id}/ship`).set(...admin.authHeader);
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown order id', async () => {
      const res = await request(getApp()).put('/api/admin/orders/99999/ship').set(...admin.authHeader);
      expect(res.status).toBe(404);
    });
  });

  describe('Admin products CRUD', () => {
    const draft = {
      name: 'Ad-hoc item',
      price: 42,
      description: 'listed by admin',
      category: '杂项',
      image: null,
      stock: 5,
    };

    it('creates, edits, lists, and deletes', async () => {
      const created = await request(getApp()).post('/api/admin/products').set(...admin.authHeader).send(draft);
      expect(created.status).toBe(201);
      const id = created.body.data.id as number;

      const list = await request(getApp()).get('/api/admin/products').set(...admin.authHeader);
      expect(list.body.data.some((p: { id: number }) => p.id === id)).toBe(true);

      const edited = await request(getApp())
        .put(`/api/admin/products/${id}`)
        .set(...admin.authHeader)
        .send({ ...draft, price: 99, stock: 20 });
      expect(edited.status).toBe(200);
      expect(Number(edited.body.data.price)).toBe(99);

      const deleted = await request(getApp()).delete(`/api/admin/products/${id}`).set(...admin.authHeader);
      expect(deleted.status).toBe(204);

      const missing = await Product.findByPk(id);
      expect(missing).toBeNull();
    });

    it('refuses to delete a product already referenced by an order', async () => {
      await request(getApp()).post('/api/cart').set(...regular.authHeader).send({ productId: data.products[0].id, quantity: 1 });
      const cart = await request(getApp()).get('/api/cart').set(...regular.authHeader);
      await request(getApp()).post('/api/orders').set(...regular.authHeader).send({
        addressId: data.address!.get('id'),
        cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id),
      });

      const res = await request(getApp())
        .delete(`/api/admin/products/${data.products[0].id}`)
        .set(...admin.authHeader);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('引用');
    });

    it('rejects invalid input', async () => {
      const res = await request(getApp())
        .post('/api/admin/products')
        .set(...admin.authHeader)
        .send({ name: '', price: -1, category: '', stock: -2 });
      expect(res.status).toBe(400);
    });
  });
});
