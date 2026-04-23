import { describe, it, expect } from 'vitest';
import { formatCNY } from './format';

describe('formatCNY', () => {
  it.each([
    [0, '¥0.00'],
    [59, '¥59.00'],
    [1234.5, '¥1,234.50'],
    ['199.99', '¥199.99'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatCNY(input)).toBe(expected);
  });

  it('falls back to 0 for null / undefined / NaN inputs', () => {
    expect(formatCNY(null)).toBe('¥0.00');
    expect(formatCNY(undefined)).toBe('¥0.00');
    expect(formatCNY('not a number')).toBe('¥0.00');
  });
});
