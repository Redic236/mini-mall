import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';

describe('Security headers (helmet)', () => {
  it('sets core hardening headers on API responses', async () => {
    const res = await request(getApp()).get('/api/products');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('removes the default x-powered-by banner', async () => {
    const res = await request(getApp()).get('/api/products');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does not set CSP on JSON API responses', async () => {
    const res = await request(getApp()).get('/api/products');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('applies headers to 404 responses too', async () => {
    const res = await request(getApp()).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
