import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { getApp } from '../helpers/app';
import { seed, SeededData, User } from '../helpers/db';
import { makeAuthed, type AuthedUser } from '../helpers/auth';
import {
  AVATARS_DIR,
  AVATAR_MAX_BYTES,
  UPLOADS_ROOT,
  ensureUploadsDir,
} from '../../src/config/uploads';

// 1x1 PNG (IHDR + IDAT + IEND) — the smallest valid PNG we can hand multer.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
  'base64',
);

describe('POST /api/auth/me/avatar', () => {
  let data: SeededData;
  let me: AuthedUser;

  beforeEach(async () => {
    data = await seed();
    me = await makeAuthed(data.user!);
    ensureUploadsDir();
  });

  afterAll(() => {
    // Wipe anything the suite wrote so CI artifacts stay clean.
    try {
      fs.rmSync(UPLOADS_ROOT, { recursive: true, force: true });
    } catch {
      // nothing to do — tmp cleanup is best-effort
    }
  });

  it('rejects unauthenticated uploads', async () => {
    const res = await request(getApp())
      .post('/api/auth/me/avatar')
      .attach('avatar', TINY_PNG, { filename: 'tiny.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
  });

  it('accepts a PNG and writes it to disk with a random name', async () => {
    const res = await request(getApp())
      .post('/api/auth/me/avatar')
      .set(...me.authHeader)
      .attach('avatar', TINY_PNG, { filename: 'anything.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    const url = res.body.data.avatar as string;
    expect(url).toMatch(/^\/uploads\/avatars\/[a-f0-9]{32}\.png$/);

    const stored = path.join(AVATARS_DIR, url.split('/').pop()!);
    expect(fs.existsSync(stored)).toBe(true);

    const reloaded = await User.findByPk(data.user!.get('id') as number);
    expect(reloaded!.get('avatar')).toBe(url);
  });

  it('deletes the previous local avatar when a new one lands', async () => {
    const first = await request(getApp())
      .post('/api/auth/me/avatar')
      .set(...me.authHeader)
      .attach('avatar', TINY_PNG, { filename: 'a.png', contentType: 'image/png' });
    const firstUrl = first.body.data.avatar as string;
    const firstPath = path.join(AVATARS_DIR, firstUrl.split('/').pop()!);
    expect(fs.existsSync(firstPath)).toBe(true);

    const second = await request(getApp())
      .post('/api/auth/me/avatar')
      .set(...me.authHeader)
      .attach('avatar', TINY_PNG, { filename: 'b.png', contentType: 'image/png' });
    const secondUrl = second.body.data.avatar as string;
    const secondPath = path.join(AVATARS_DIR, secondUrl.split('/').pop()!);

    expect(secondUrl).not.toBe(firstUrl);
    expect(fs.existsSync(secondPath)).toBe(true);

    // Unlink is best-effort async — give it a tick to finish.
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.existsSync(firstPath)).toBe(false);
  });

  it('leaves external avatar URLs alone when replacing them', async () => {
    // Simulate a user whose avatar came from the seed (external URL).
    const userId = data.user!.get('id') as number;
    await User.update({ avatar: 'https://example.com/old.jpg' }, { where: { id: userId } });

    const res = await request(getApp())
      .post('/api/auth/me/avatar')
      .set(...me.authHeader)
      .attach('avatar', TINY_PNG, { filename: 'new.png', contentType: 'image/png' });

    // External URL replaced in DB; no filesystem churn to verify (and no
    // exception was raised trying to unlink a non-local path).
    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toMatch(/^\/uploads\/avatars\//);
  });

  it('rejects non-whitelisted MIME types', async () => {
    const res = await request(getApp())
      .post('/api/auth/me/avatar')
      .set(...me.authHeader)
      .attach('avatar', Buffer.from('<svg/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('JPG');
  });

  it('rejects uploads larger than the size limit', async () => {
    const oversized = Buffer.alloc(AVATAR_MAX_BYTES + 1024, 0);
    const res = await request(getApp())
      .post('/api/auth/me/avatar')
      .set(...me.authHeader)
      .attach('avatar', oversized, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('过大');
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(getApp())
      .post('/api/auth/me/avatar')
      .set(...me.authHeader);
    expect(res.status).toBe(400);
  });
});
