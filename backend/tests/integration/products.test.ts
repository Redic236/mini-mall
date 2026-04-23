import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData } from '../helpers/db';

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
});
