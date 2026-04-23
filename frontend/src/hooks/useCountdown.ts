import { useEffect, useState } from 'react';

/**
 * Returns the remaining milliseconds until `target`. Ticks every 1s; yields 0
 * once the deadline passes (or if `target` is null, indicating "no countdown").
 */
export function useCountdown(target: Date | null, tickMs = 1000): number {
  const computeRemaining = (): number => {
    if (!target) return 0;
    const diff = target.getTime() - Date.now();
    return diff > 0 ? diff : 0;
  };

  const [remainingMs, setRemainingMs] = useState(computeRemaining);

  useEffect(() => {
    if (!target) {
      setRemainingMs(0);
      return undefined;
    }
    setRemainingMs(computeRemaining());
    const id = window.setInterval(() => {
      const diff = target.getTime() - Date.now();
      setRemainingMs(diff > 0 ? diff : 0);
    }, tickMs);
    return () => window.clearInterval(id);
    // `target` is a Date object — identity changes on every parent render if
    // callers don't memoize, so key the effect on its timestamp instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.getTime(), tickMs]);

  return remainingMs;
}

export function formatMmSs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
