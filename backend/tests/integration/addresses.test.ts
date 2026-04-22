import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, truncateAll } from '../helpers/db';

const baseAddr = {
  name: '收货人',
  phone: '13800000000',
  province: '北京',
  city: '北京',
  district: '朝阳',
  detail: 'test路',
};

describe('Addresses API', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('POST /api/addresses', () => {
    it('creates a non-default address', async () => {
      const res = await request(getApp()).post('/api/addresses').send(baseAddr);
      expect(res.status).toBe(201);
      expect(res.body.data.isDefault).toBe(false);
    });

    it('creating with isDefault=true flips others', async () => {
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, isDefault: true });
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'x2', isDefault: true });

      const list = await request(getApp()).get('/api/addresses');
      const defaults = list.body.data.filter((a: { isDefault: boolean }) => a.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].detail).toBe('x2');
    });

    it('rejects missing fields', async () => {
      const res = await request(getApp())
        .post('/api/addresses')
        .send({ ...baseAddr, name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/addresses', () => {
    it('orders default first', async () => {
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'a' });
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'b', isDefault: true });
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'c' });

      const res = await request(getApp()).get('/api/addresses');
      expect(res.body.data[0].isDefault).toBe(true);
      expect(res.body.data[0].detail).toBe('b');
    });
  });

  describe('PUT /api/addresses/:id', () => {
    it('updates and flips default exclusivity', async () => {
      const a = await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'a' });
      const b = await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'b', isDefault: true });

      const res = await request(getApp())
        .put(`/api/addresses/${a.body.data.id}`)
        .send({ ...baseAddr, detail: 'a-new', isDefault: true });

      expect(res.status).toBe(200);
      expect(res.body.data.detail).toBe('a-new');
      expect(res.body.data.isDefault).toBe(true);

      const list = await request(getApp()).get('/api/addresses');
      const bAfter = list.body.data.find((x: { id: number }) => x.id === b.body.data.id);
      expect(bAfter.isDefault).toBe(false);
    });

    it('returns 404 for missing id', async () => {
      const res = await request(getApp()).put('/api/addresses/99999').send(baseAddr);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/addresses/:id', () => {
    it('promotes the next address to default when deleting current default', async () => {
      const first = await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'a' });
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'b' });
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'c', isDefault: true });

      // delete the current default (c)
      const list1 = await request(getApp()).get('/api/addresses');
      const defaultId = list1.body.data.find((a: { isDefault: boolean }) => a.isDefault).id;
      await request(getApp()).delete(`/api/addresses/${defaultId}`);

      const list2 = await request(getApp()).get('/api/addresses');
      const defaults = list2.body.data.filter((a: { isDefault: boolean }) => a.isDefault);
      expect(defaults).toHaveLength(1);
      // Lowest remaining id wins — that's `first` (detail 'a')
      expect(defaults[0].id).toBe(first.body.data.id);
    });

    it('does not promote when deleting a non-default address', async () => {
      await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'a', isDefault: true });
      const b = await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'b' });

      await request(getApp()).delete(`/api/addresses/${b.body.data.id}`);

      const list = await request(getApp()).get('/api/addresses');
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].isDefault).toBe(true);
    });
  });

  describe('PATCH /api/addresses/:id/default', () => {
    it('marks as default and clears others', async () => {
      const a = await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'a', isDefault: true });
      const b = await request(getApp()).post('/api/addresses').send({ ...baseAddr, detail: 'b' });

      const res = await request(getApp()).patch(`/api/addresses/${b.body.data.id}/default`);
      expect(res.status).toBe(200);
      expect(res.body.data.isDefault).toBe(true);

      const list = await request(getApp()).get('/api/addresses');
      const aAfter = list.body.data.find((x: { id: number }) => x.id === a.body.data.id);
      expect(aAfter.isDefault).toBe(false);
    });
  });

  // Silence unused seed import warning for TS strict mode.
  it('(warmup) seed helper works', async () => {
    const d = await seed({ address: true });
    expect(d.address).not.toBeNull();
  });
});
