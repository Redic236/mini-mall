import { expirePendingOrders } from '../services/orderService';
import { logger } from '../utils/logger';

const DEFAULT_EXPIRY_MINUTES = 30;
const SCAN_INTERVAL_MS = 60_000;

function resolveExpiryMinutes(): number {
  const raw = process.env.ORDER_EXPIRY_MINUTES;
  if (!raw) return DEFAULT_EXPIRY_MINUTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn('Invalid ORDER_EXPIRY_MINUTES; falling back to default', {
      raw,
      default: DEFAULT_EXPIRY_MINUTES,
    });
    return DEFAULT_EXPIRY_MINUTES;
  }
  return parsed;
}

let timer: NodeJS.Timeout | null = null;
let inFlight = false;

async function tick(expiryMinutes: number): Promise<void> {
  if (inFlight) return; // Guard against a slow tick overlapping the next one.
  inFlight = true;
  try {
    const cutoff = new Date(Date.now() - expiryMinutes * 60_000);
    const cancelled = await expirePendingOrders(cutoff);
    if (cancelled.length > 0) {
      logger.info('Auto-cancelled expired orders', { count: cancelled.length, ids: cancelled });
    }
  } catch (err) {
    logger.error('Order expiry tick failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  } finally {
    inFlight = false;
  }
}

export function startExpiryScheduler(): void {
  if (timer) return;
  const expiryMinutes = resolveExpiryMinutes();
  logger.info('Starting order expiry scheduler', {
    expiryMinutes,
    scanIntervalMs: SCAN_INTERVAL_MS,
  });
  // Kick once on boot so stale orders from a previous run get cleaned up promptly.
  void tick(expiryMinutes);
  timer = setInterval(() => void tick(expiryMinutes), SCAN_INTERVAL_MS);
  // Don't keep the Node event loop alive just for this timer.
  timer.unref?.();
}

export function stopExpiryScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
