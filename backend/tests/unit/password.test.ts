import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password';

describe('password', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('secret-pw');
    expect(hash).not.toBe('secret-pw');
    expect(await verifyPassword('secret-pw', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('secret-pw');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for the same input (salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});
