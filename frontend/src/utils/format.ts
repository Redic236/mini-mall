const cnyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatCNY(value: number | string | null | undefined): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return cnyFormatter.format(0);
  return cnyFormatter.format(n);
}
