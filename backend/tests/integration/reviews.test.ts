import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData } from '../helpers/db';
import { createUser, makeAuthed, type AuthedUser } from '../helpers/auth';

/**
 * Walk an order through the full lifecycle to 已完成 so the user becomes
 * eligible to review every product on it. Ensures the user has at least
 * one address, creating one if missing. Returns the order id.
 */
async function completeOrderWith(
  me: AuthedUser,
  _data: SeededData,
  productIds: number[],
): Promise<number> {
  const addrList = await request(getApp()).get('/api/addresses').set(...me.authHeader);
  let addressId: number;
  if (addrList.body.data.length > 0) {
    addressId = addrList.body.data[0].id;
  } else {
    const created = await request(getApp())
      .post('/api/addresses')
      .set(...me.authHeader)
      .send({
        name: '测试',
        phone: '13800000000',
        province: '北京',
        city: '北京',
        district: '朝阳',
        detail: 'x',
        isDefault: true,
      });
    addressId = created.body.data.id;
  }

  for (const pid of productIds) {
    await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: pid, quantity: 1 });
  }
  const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
  const cartItemIds = cart.body.data.items.map((it: { id: number }) => it.id);

  const order = await request(getApp())
    .post('/api/orders')
    .set(...me.authHeader)
    .send({ addressId, cartItemIds });
  const orderId = order.body.data.id as number;

  await request(getApp()).put(`/api/orders/${orderId}/pay`).set(...me.authHeader);
  await request(getApp()).put(`/api/orders/${orderId}/ship`).set(...me.authHeader);
  await request(getApp()).put(`/api/orders/${orderId}/confirm`).set(...me.authHeader);

  return orderId;
}

describe('Reviews API', () => {
  let data: SeededData;
  let me: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
  });

  describe('POST /api/reviews', () => {
    it('rejects unauthenticated requests', async () => {
      const res = await request(getApp())
        .post('/api/reviews')
        .send({ productId: data.products[0].id, rating: 5 });
      expect(res.status).toBe(401);
    });

    it('rejects when user has no completed order for the product', async () => {
      const res = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 5, content: 'nice' });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('已完成');
    });

    it('rejects before order reaches 已完成 (just paid / shipped)', async () => {
      const p = data.products[0];
      await request(getApp()).post('/api/cart').set(...me.authHeader).send({ productId: p.id, quantity: 1 });
      const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
      const order = await request(getApp())
        .post('/api/orders')
        .set(...me.authHeader)
        .send({ addressId: data.address!.get('id'), cartItemIds: cart.body.data.items.map((it: { id: number }) => it.id) });
      await request(getApp()).put(`/api/orders/${order.body.data.id}/pay`).set(...me.authHeader);
      await request(getApp()).put(`/api/orders/${order.body.data.id}/ship`).set(...me.authHeader);

      const res = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: p.id, rating: 5 });
      expect(res.status).toBe(403);
    });

    it('creates a review after a completed order', async () => {
      await completeOrderWith(me, data, [data.products[0].id]);

      const res = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 5, content: 'love it' });
      expect(res.status).toBe(201);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.content).toBe('love it');
      expect(res.body.data.user.username).toBe('tester');
    });

    it('rejects duplicate review for the same product', async () => {
      await completeOrderWith(me, data, [data.products[0].id]);
      await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 4 });

      const res = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 5 });
      expect(res.status).toBe(409);
    });

    it.each([
      { rating: 0 },
      { rating: 6 },
      { rating: 3.5 },
      { content: 'x'.repeat(1001) },
    ])('rejects invalid payload %j', async (bad) => {
      await completeOrderWith(me, data, [data.products[0].id]);
      const res = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 5, ...bad });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/reviews', () => {
    it('is public and returns empty for a product with no reviews', async () => {
      const res = await request(getApp()).get('/api/reviews').query({ productId: data.products[0].id });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ items: [], total: 0, averageRating: 0 });
    });

    it('returns paginated reviews and average rating', async () => {
      const pid = data.products[0].id;
      // 3 users all leave reviews for the same product
      const users = [me, await createUser(), await createUser()];
      const ratings = [5, 4, 3];
      for (let i = 0; i < users.length; i += 1) {
        await completeOrderWith(users[i], data, [pid]);
        await request(getApp())
          .post('/api/reviews')
          .set(...users[i].authHeader)
          .send({ productId: pid, rating: ratings[i], content: `r${i}` });
      }

      const res = await request(getApp()).get('/api/reviews').query({ productId: pid, limit: 2, page: 1 });
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.averageRating).toBe(4); // (5+4+3)/3
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('updates own review', async () => {
      await completeOrderWith(me, data, [data.products[0].id]);
      const created = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 3 });

      const res = await request(getApp())
        .put(`/api/reviews/${created.body.data.id}`)
        .set(...me.authHeader)
        .send({ rating: 5, content: 'updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.content).toBe('updated');
    });

    it('returns 404 when updating another user\'s review', async () => {
      await completeOrderWith(me, data, [data.products[0].id]);
      const created = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 3 });

      const other = await createUser();
      const res = await request(getApp())
        .put(`/api/reviews/${created.body.data.id}`)
        .set(...other.authHeader)
        .send({ rating: 1 });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('deletes own review', async () => {
      await completeOrderWith(me, data, [data.products[0].id]);
      const created = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 3 });

      const res = await request(getApp())
        .delete(`/api/reviews/${created.body.data.id}`)
        .set(...me.authHeader);
      expect(res.status).toBe(200);

      const list = await request(getApp()).get('/api/reviews').query({ productId: data.products[0].id });
      expect(list.body.data.total).toBe(0);
    });

    it('returns 404 when deleting another user\'s review', async () => {
      await completeOrderWith(me, data, [data.products[0].id]);
      const created = await request(getApp())
        .post('/api/reviews')
        .set(...me.authHeader)
        .send({ productId: data.products[0].id, rating: 3 });

      const other = await createUser();
      const res = await request(getApp())
        .delete(`/api/reviews/${created.body.data.id}`)
        .set(...other.authHeader);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/reviews/eligibility', () => {
    it('returns canReview=false before any order', async () => {
      const res = await request(getApp())
        .get('/api/reviews/eligibility')
        .query({ productId: data.products[0].id })
        .set(...me.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ canReview: false, alreadyReviewed: false, eligibleOrderId: null });
    });

    it('returns canReview=true after completed order', async () => {
      const pid = data.products[0].id;
      await completeOrderWith(me, data, [pid]);
      const res = await request(getApp())
        .get('/api/reviews/eligibility')
        .query({ productId: pid })
        .set(...me.authHeader);
      expect(res.body.data.canReview).toBe(true);
      expect(res.body.data.eligibleOrderId).not.toBeNull();
    });

    it('returns alreadyReviewed=true after the user has reviewed', async () => {
      const pid = data.products[0].id;
      await completeOrderWith(me, data, [pid]);
      await request(getApp()).post('/api/reviews').set(...me.authHeader).send({ productId: pid, rating: 4 });

      const res = await request(getApp())
        .get('/api/reviews/eligibility')
        .query({ productId: pid })
        .set(...me.authHeader);
      expect(res.body.data).toMatchObject({ canReview: false, alreadyReviewed: true });
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(getApp()).get('/api/reviews/eligibility').query({ productId: 1 });
      expect(res.status).toBe(401);
    });
  });
});
