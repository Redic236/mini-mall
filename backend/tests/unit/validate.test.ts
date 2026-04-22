import { describe, it, expect } from 'vitest';
import {
  addCartBodySchema,
  addressBodySchema,
  createOrderBodySchema,
  idSchema,
  orderStatusQuerySchema,
  parseOrThrow,
  updateCartBodySchema,
} from '../../src/utils/validate';
import { HttpError } from '../../src/utils/apiResponse';

describe('addCartBodySchema', () => {
  it('accepts valid input', () => {
    expect(() => parseOrThrow(addCartBodySchema, { productId: 1, quantity: 2 })).not.toThrow();
  });

  it.each([
    { productId: -1, quantity: 1 },
    { productId: 1, quantity: 0 },
    { productId: 1, quantity: -1 },
    { productId: 1, quantity: 1.5 },
    { productId: 1, quantity: 'abc' },
    { quantity: 1 },
    { productId: 1 },
  ])('rejects invalid input %j', (bad) => {
    expect(() => parseOrThrow(addCartBodySchema, bad)).toThrow(HttpError);
  });
});

describe('updateCartBodySchema', () => {
  it('rejects quantity <= 0', () => {
    expect(() => parseOrThrow(updateCartBodySchema, { quantity: 0 })).toThrow(HttpError);
  });
});

describe('addressBodySchema', () => {
  const valid = {
    name: '张三',
    phone: '13800138000',
    province: '北京',
    city: '北京',
    district: '朝阳',
    detail: 'A1 路',
  };

  it('accepts valid input', () => {
    expect(() => parseOrThrow(addressBodySchema, valid)).not.toThrow();
  });

  it('rejects empty name', () => {
    expect(() => parseOrThrow(addressBodySchema, { ...valid, name: '' })).toThrow(HttpError);
  });

  it('rejects name > 50 chars', () => {
    expect(() =>
      parseOrThrow(addressBodySchema, { ...valid, name: 'x'.repeat(51) }),
    ).toThrow(HttpError);
  });

  it('trims whitespace', () => {
    const parsed = parseOrThrow(addressBodySchema, { ...valid, name: '  bob  ' });
    expect(parsed.name).toBe('bob');
  });
});

describe('createOrderBodySchema', () => {
  it('rejects empty cartItemIds', () => {
    expect(() =>
      parseOrThrow(createOrderBodySchema, { addressId: 1, cartItemIds: [] }),
    ).toThrow(HttpError);
  });
});

describe('orderStatusQuerySchema', () => {
  it('accepts known statuses', () => {
    expect(parseOrThrow(orderStatusQuerySchema, '待支付', 'status')).toBe('待支付');
  });

  it('rejects unknown status', () => {
    expect(() => parseOrThrow(orderStatusQuerySchema, 'nope', 'status')).toThrow(HttpError);
  });

  it('allows undefined (no filter)', () => {
    expect(parseOrThrow(orderStatusQuerySchema, undefined, 'status')).toBeUndefined();
  });
});

describe('idSchema', () => {
  it('coerces numeric strings', () => {
    expect(parseOrThrow(idSchema, '42', 'id')).toBe(42);
  });

  it('rejects non-numeric', () => {
    expect(() => parseOrThrow(idSchema, 'abc', 'id')).toThrow(HttpError);
  });

  it('rejects zero', () => {
    expect(() => parseOrThrow(idSchema, '0', 'id')).toThrow(HttpError);
  });
});
