import { describe, it, expect } from 'vitest';
import { generateOrderNo } from '../../src/utils/orderNo';

describe('generateOrderNo', () => {
  it('has ORD prefix + 17-digit timestamp + 6-digit random', () => {
    const no = generateOrderNo();
    expect(no).toMatch(/^ORD\d{23}$/);
    expect(no.startsWith('ORD')).toBe(true);
    expect(no.length).toBe(26);
  });

  it('produces unique values across 1000 sequential calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      set.add(generateOrderNo());
    }
    expect(set.size).toBe(1000);
  });
});
