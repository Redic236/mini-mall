import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, Product } from '../helpers/db';
import { createUser, makeAuthed, type AuthedUser } from '../helpers/auth';

async function placeOrder(
  me: AuthedUser,
  addressId: number,
  items: Array<{ productId: number; quantity: number }>,
): Promise<number> {
  for (const it of items) {
    await request(getApp()).post('/api/cart').set(...me.authHeader).send(it);
  }
  const cart = await request(getApp()).get('/api/cart').set(...me.authHeader);
  const order = await request(getApp()).post('/api/orders').set(...me.authHeader).send({
    addressId,
    cartItemIds: cart.body.data.items.map((c: { id: number }) => c.id),
  });
  return order.body.data.id as number;
}

describe('GET /api/products/:id/recommendations', () => {
  let data: SeededData;
  let me: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
  });

  it('ranks by co-occurrence when we have order history', async () => {
    const [tee, jeans, sneakers] = data.products;
    // Orders:
    //  - T-Shirt + Jeans (×3 orders)
    //  - T-Shirt + Sneakers (×1 order)
    // Expected: recommendations for T-Shirt put Jeans first, Sneakers second.
    await placeOrder(me, data.address!.get('id') as number, [
      { productId: tee.id, quantity: 1 },
      { productId: jeans.id, quantity: 1 },
    ]);

    for (let i = 0; i < 2; i += 1) {
      const other = await createUser();
      const addr = await request(getApp()).post('/api/addresses').set(...other.authHeader).send({
        name: 'x', phone: '13800000022', province: 'p', city: 'c', district: 'd', detail: 'd',
      });
      await placeOrder(other, addr.body.data.id as number, [
        { productId: tee.id, quantity: 1 },
        { productId: jeans.id, quantity: 1 },
      ]);
    }

    const third = await createUser();
    const addr = await request(getApp()).post('/api/addresses').set(...third.authHeader).send({
      name: 'x', phone: '13800000033', province: 'p', city: 'c', district: 'd', detail: 'd',
    });
    await placeOrder(third, addr.body.data.id as number, [
      { productId: tee.id, quantity: 1 },
      { productId: sneakers.id, quantity: 1 },
    ]);

    const res = await request(getApp()).get(`/api/products/${tee.id}/recommendations`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].product.id).toBe(jeans.id);
    expect(res.body.data[0].source).toBe('cf');
    expect(Number(res.body.data[0].score)).toBe(3);
    expect(res.body.data[1].product.id).toBe(sneakers.id);
    expect(Number(res.body.data[1].score)).toBe(1);
  });

  it('excludes the target product from its own recommendations', async () => {
    const [tee, jeans] = data.products;
    await placeOrder(me, data.address!.get('id') as number, [
      { productId: tee.id, quantity: 1 },
      { productId: jeans.id, quantity: 1 },
    ]);

    const res = await request(getApp()).get(`/api/products/${tee.id}/recommendations`);
    const ids = (res.body.data as Array<{ product: { id: number } }>).map((r) => r.product.id);
    expect(ids).not.toContain(tee.id);
  });

  it('ignores cancelled orders when scoring', async () => {
    const [tee, jeans] = data.products;
    const orderId = await placeOrder(me, data.address!.get('id') as number, [
      { productId: tee.id, quantity: 1 },
      { productId: jeans.id, quantity: 1 },
    ]);
    await request(getApp()).put(`/api/orders/${orderId}/cancel`).set(...me.authHeader);

    const res = await request(getApp()).get(`/api/products/${tee.id}/recommendations`);
    // No surviving co-occurrence — falls back to category-based recommendations.
    expect(res.body.data.every((r: { source: string }) => r.source === 'category-fallback')).toBe(true);
  });

  it('falls back to same-category top sellers when no co-occurrence exists', async () => {
    const [tee, jeans] = data.products; // both 'apparel'
    await Product.update({ salesCount: 42 }, { where: { id: jeans.id } });

    const res = await request(getApp()).get(`/api/products/${tee.id}/recommendations?limit=3`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].product.id).toBe(jeans.id);
    expect(res.body.data[0].source).toBe('category-fallback');
  });

  it('caps at the limit', async () => {
    const res = await request(getApp()).get(`/api/products/${data.products[0].id}/recommendations?limit=1`);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it('returns 404 for an unknown product', async () => {
    const res = await request(getApp()).get('/api/products/99999/recommendations');
    expect(res.status).toBe(404);
  });

  it('rejects absurd limit values', async () => {
    const res = await request(getApp()).get(`/api/products/${data.products[0].id}/recommendations?limit=9999`);
    expect(res.status).toBe(400);
  });
});
