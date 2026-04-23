import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, truncateAll } from '../helpers/db';
import { createUser, makeAuthed, type AuthedUser } from '../helpers/auth';

const baseAddr = {
  name: '收货人',
  phone: '13800000000',
  province: '北京',
  city: '北京',
  district: '朝阳',
  detail: 'test路',
};

describe('Addresses API', () => {
  let me: AuthedUser;

  beforeEach(async () => {
    await truncateAll();
    me = await createUser();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(getApp()).get('/api/addresses');
    expect(res.status).toBe(401);
  });

  describe('POST /api/addresses', () => {
    it('creates a non-default address', async () => {
      const res = await request(getApp()).post('/api/addresses').set(...me.authHeader).send(baseAddr);
      expect(res.status).toBe(201);
      expect(res.body.data.isDefault).toBe(false);
    });

    it('creating with isDefault=true flips others of the same user', async () => {
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, isDefault: true });
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'x2', isDefault: true });

      const list = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      const defaults = list.body.data.filter((a: { isDefault: boolean }) => a.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].detail).toBe('x2');
    });

    it('rejects missing fields', async () => {
      const res = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, name: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/addresses', () => {
    it('orders default first', async () => {
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'a' });
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'b', isDefault: true });
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'c' });

      const res = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      expect(res.body.data[0].isDefault).toBe(true);
      expect(res.body.data[0].detail).toBe('b');
    });

    it('returns only the caller\'s addresses', async () => {
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'mine' });
      const other = await createUser();
      await request(getApp()).post('/api/addresses').set(...other.authHeader).send({ ...baseAddr, detail: 'theirs' });

      const mine = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      expect(mine.body.data).toHaveLength(1);
      expect(mine.body.data[0].detail).toBe('mine');
    });
  });

  describe('PUT /api/addresses/:id', () => {
    it('updates and flips default exclusivity', async () => {
      const a = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'a' });
      const b = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'b', isDefault: true });

      const res = await request(getApp())
        .put(`/api/addresses/${a.body.data.id}`)
        .set(...me.authHeader)
        .send({ ...baseAddr, detail: 'a-new', isDefault: true });

      expect(res.status).toBe(200);
      expect(res.body.data.detail).toBe('a-new');
      expect(res.body.data.isDefault).toBe(true);

      const list = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      const bAfter = list.body.data.find((x: { id: number }) => x.id === b.body.data.id);
      expect(bAfter.isDefault).toBe(false);
    });

    it('returns 404 when trying to update another user\'s address', async () => {
      const a = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'a' });
      const other = await createUser();

      const res = await request(getApp())
        .put(`/api/addresses/${a.body.data.id}`)
        .set(...other.authHeader)
        .send({ ...baseAddr, detail: 'hijack' });
      expect(res.status).toBe(404);
    });

    it('returns 404 for missing id', async () => {
      const res = await request(getApp()).put('/api/addresses/99999').set(...me.authHeader).send(baseAddr);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/addresses/:id', () => {
    it('promotes the next address to default when deleting current default', async () => {
      const first = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'a' });
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'b' });
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'c', isDefault: true });

      const list1 = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      const defaultId = list1.body.data.find((a: { isDefault: boolean }) => a.isDefault).id;
      await request(getApp()).delete(`/api/addresses/${defaultId}`).set(...me.authHeader);

      const list2 = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      const defaults = list2.body.data.filter((a: { isDefault: boolean }) => a.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(first.body.data.id);
    });

    it('does not promote when deleting a non-default address', async () => {
      await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'a', isDefault: true });
      const b = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'b' });

      await request(getApp()).delete(`/api/addresses/${b.body.data.id}`).set(...me.authHeader);

      const list = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].isDefault).toBe(true);
    });
  });

  describe('PATCH /api/addresses/:id/default', () => {
    it('marks as default and clears others of the same user', async () => {
      const a = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'a', isDefault: true });
      const b = await request(getApp()).post('/api/addresses').set(...me.authHeader).send({ ...baseAddr, detail: 'b' });

      const res = await request(getApp()).patch(`/api/addresses/${b.body.data.id}/default`).set(...me.authHeader);
      expect(res.status).toBe(200);
      expect(res.body.data.isDefault).toBe(true);

      const list = await request(getApp()).get('/api/addresses').set(...me.authHeader);
      const aAfter = list.body.data.find((x: { id: number }) => x.id === a.body.data.id);
      expect(aAfter.isDefault).toBe(false);
    });
  });

  it('(warmup) seed helper works with user scope', async () => {
    const d = await seed();
    expect(d.user).not.toBeNull();
    expect(d.address).not.toBeNull();
    const authed = await makeAuthed(d.user!);
    const list = await request(getApp()).get('/api/addresses').set(...authed.authHeader);
    expect(list.body.data).toHaveLength(1);
  });
});
