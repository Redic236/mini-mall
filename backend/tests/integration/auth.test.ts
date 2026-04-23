import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { truncateAll } from '../helpers/db';

const valid = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'password123',
};

describe('Auth API', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
      const res = await request(getApp()).post('/api/auth/register').send(valid);
      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeTypeOf('string');
      expect(res.body.data.user.email).toBe(valid.email);
      expect(res.body.data.user.username).toBe(valid.username);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate email', async () => {
      await request(getApp()).post('/api/auth/register').send(valid);
      const res = await request(getApp())
        .post('/api/auth/register')
        .send({ ...valid, username: 'alice2' });
      expect(res.status).toBe(409);
      expect(res.body.message).toContain('邮箱');
    });

    it('rejects duplicate username', async () => {
      await request(getApp()).post('/api/auth/register').send(valid);
      const res = await request(getApp())
        .post('/api/auth/register')
        .send({ ...valid, email: 'other@example.com' });
      expect(res.status).toBe(409);
      expect(res.body.message).toContain('用户名');
    });

    it.each([
      { ...valid, password: 'short' },
      { ...valid, email: 'not-an-email' },
      { ...valid, username: 'a' },
      { ...valid, username: 'has spaces' },
    ])('rejects invalid payload %j', async (bad) => {
      const res = await request(getApp()).post('/api/auth/register').send(bad);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(getApp()).post('/api/auth/register').send(valid);
    });

    it('logs in with correct credentials', async () => {
      const res = await request(getApp())
        .post('/api/auth/login')
        .send({ email: valid.email, password: valid.password });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTypeOf('string');
    });

    it('rejects wrong password', async () => {
      const res = await request(getApp())
        .post('/api/auth/login')
        .send({ email: valid.email, password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('rejects unknown email', async () => {
      const res = await request(getApp())
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: valid.password });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without token', async () => {
      const res = await request(getApp()).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed token', async () => {
      const res = await request(getApp()).get('/api/auth/me').set('Authorization', 'Bearer garbage');
      expect(res.status).toBe(401);
    });

    it('returns current user with valid token', async () => {
      const reg = await request(getApp()).post('/api/auth/register').send(valid);
      const token = reg.body.data.token;

      const res = await request(getApp()).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(valid.email);
    });
  });
});
