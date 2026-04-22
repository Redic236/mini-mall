import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData } from '../helpers/db';

describe('Products API', () => {
  let data: SeededData;

  beforeEach(async () => {
    data = await seed();
  });

  it('GET /api/products returns all products', async () => {
    const res = await request(getApp()).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
  });

  it('GET /api/products/:id returns a single product', async () => {
    const p = data.products[0];
    const res = await request(getApp()).get(`/api/products/${p.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(p.id);
    expect(res.body.data.name).toBe('T-Shirt');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(getApp()).get('/api/products/99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await request(getApp()).get('/api/products/abc');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/id/);
  });
});
