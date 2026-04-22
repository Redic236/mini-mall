import type { Transaction } from 'sequelize';
import { Order } from '../models';
import { HttpError } from './apiResponse';

function formatTimestamp(d: Date): string {
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    pad(d.getMilliseconds(), 3)
  );
}

// Process-local monotonic counter guarantees uniqueness within the same ms;
// combined with the timestamp, collisions across restarts require the exact
// same ms AND the exact same counter value — effectively impossible at this scale.
let counter = 0;

export function generateOrderNo(): string {
  const ts = formatTimestamp(new Date());
  counter = (counter + 1) % 1_000_000;
  const counterStr = counter.toString().padStart(6, '0');
  return `ORD${ts}${counterStr}`;
}

const MAX_ATTEMPTS = 5;

export async function generateUniqueOrderNo(transaction: Transaction): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = generateOrderNo();
    const existing = await Order.findOne({
      where: { orderNo: candidate },
      attributes: ['id'],
      transaction,
    });
    if (!existing) return candidate;
  }
  throw new HttpError(500, '订单号生成失败，请重试');
}
