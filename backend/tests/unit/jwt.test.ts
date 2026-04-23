import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../../src/utils/jwt';
import { HttpError } from '../../src/utils/apiResponse';

describe('jwt', () => {
  it('signs and verifies a token', () => {
    const token = signToken({ userId: 42 });
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(42);
  });

  it('rejects a malformed token', () => {
    expect(() => verifyToken('not-a-token')).toThrow(HttpError);
  });

  it('rejects an expired token', () => {
    const token = signToken({ userId: 1 }, '-1s');
    expect(() => verifyToken(token)).toThrow(/过期/);
  });
});
