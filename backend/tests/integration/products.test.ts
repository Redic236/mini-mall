import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData } from '../helpers/db';
import { Order, OrderItem, ORDER_STATUS, Review } from '../../src/models';

describe('Products API', () => {
  let data: SeededData;

  beforeEach(async () => {
    data = await seed();
  });

  describe('GET /api/products', () => {
    it('returns all products when no filters', async () => {
      const res = await request(getApp()).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('filters by category', async () => {
      const res = await request(getApp()).get('/api/products?category=footwear');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Sneakers');
    });

    it('filters by keyword across name and description', async () => {
      const byName = await request(getApp()).get('/api/products?keyword=Jeans');
      expect(byName.body.data).toHaveLength(1);
      expect(byName.body.data[0].name).toBe('Jeans');

      const byDescription = await request(getApp()).get('/api/products?keyword=runners');
      expect(byDescription.body.data).toHaveLength(1);
      expect(byDescription.body.data[0].name).toBe('Sneakers');
    });

    it('combines keyword + category filters', async () => {
      const res = await request(getApp()).get('/api/products?keyword=cotton&category=apparel');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('T-Shirt');
    });

    it('returns empty list for no matches', async () => {
      const res = await request(getApp()).get('/api/products?keyword=nonexistent');
      expect(res.body.data).toHaveLength(0);
    });

    it('rejects empty keyword', async () => {
      const res = await request(getApp()).get('/api/products?keyword=');
      // An empty string is still a string — Zod min(1) rejects it after trim.
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/products/categories', () => {
    it('returns categories with counts', async () => {
      const res = await request(getApp()).get('/api/products/categories');
      expect(res.status).toBe(200);
      const map = new Map(
        res.body.data.map((row: { category: string; count: number }) => [row.category, row.count]),
      );
      expect(map.get('apparel')).toBe(2);
      expect(map.get('footwear')).toBe(1);
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns a single product', async () => {
      const p = data.products[0];
      const res = await request(getApp()).get(`/api/products/${p.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('T-Shirt');
      expect(res.body.data.category).toBe('apparel');
    });

    it('returns 404 for unknown id', async () => {
      const res = await request(getApp()).get('/api/products/99999');
      expect(res.status).toBe(404);
    });

    it('returns 400 for non-numeric id', async () => {
      const res = await request(getApp()).get('/api/products/abc');
      expect(res.status).toBe(400);
    });
  });

  describe('rating aggregates', () => {
    it('returns averageRating=0 and reviewCount=0 when no reviews exist', async () => {
      const res = await request(getApp()).get('/api/products');
      for (const p of res.body.data) {
        expect(Number(p.averageRating)).toBe(0);
        expect(Number(p.reviewCount)).toBe(0);
      }
    });

    it('reflects review aggregates in list and detail responses', async () => {
      const p = data.products[0];
      // Create a minimal order row so the FK on reviews is satisfied.
      const order = await Order.create({
        orderNo: 'TEST0000000000000000000001',
        userId: data.user!.get('id') as number,
        addressId: data.address!.get('id') as number,
        totalAmount: 0,
        status: ORDER_STATUS.DONE,
      });
      await OrderItem.create({
        orderId: order.get('id') as number,
        productId: p.id,
        quantity: 1,
        price: 0,
      });
      await Review.create({
        userId: data.user!.get('id') as number,
        productId: p.id,
        orderId: order.get('id') as number,
        rating: 4,
        content: 'ok',
      });

      const list = await request(getApp()).get('/api/products');
      const target = list.body.data.find((x: { id: number }) => x.id === p.id);
      expect(Number(target.averageRating)).toBe(4);
      expect(Number(target.reviewCount)).toBe(1);

      const detail = await request(getApp()).get(`/api/products/${p.id}`);
      expect(Number(detail.body.data.averageRating)).toBe(4);
      expect(Number(detail.body.data.reviewCount)).toBe(1);
    });
  });
});
