import { useMemo } from 'react';
import { Typography } from 'antd';
import { formatMmSs, useCountdown } from '@/hooks/useCountdown';

// Matches backend ORDER_EXPIRY_MINUTES default. Pragmatic: scheduler is the
// source of truth; this constant just drives the UI hint.
const ORDER_EXPIRY_MINUTES = 30;

interface OrderCountdownProps {
  createdAt: string | undefined;
}

export default function OrderCountdown({ createdAt }: OrderCountdownProps): JSX.Element | null {
  const deadline = useMemo(() => {
    if (!createdAt) return null;
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return null;
    return new Date(created.getTime() + ORDER_EXPIRY_MINUTES * 60_000);
  }, [createdAt]);

  const remainingMs = useCountdown(deadline);

  if (!deadline) return null;

  if (remainingMs <= 0) {
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        即将自动取消
      </Typography.Text>
    );
  }
  return (
    <Typography.Text type="warning" style={{ fontSize: 12 }}>
      剩余 {formatMmSs(remainingMs)} 自动取消
    </Typography.Text>
  );
}
