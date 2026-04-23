import { useEffect, useState } from 'react';
import { Empty, Spin, Timeline, Typography } from 'antd';
import { fetchShipmentEvents } from '@/services/shipment';
import type { ShipmentEvent } from '@/types';
import { SHIPMENT_STATUS_LABEL } from '@/types';

interface Props {
  orderId: number;
}

// Module-scoped cache so an AntD <Collapse> that unmounts+remounts this
// component (default behavior on collapse/expand) doesn't re-hit the API
// on every toggle. Events are append-only from the user's perspective, so
// stale cache here is benign — a full page refresh clears it.
const eventsCache = new Map<number, ShipmentEvent[]>();

/**
 * Read-only shipment timeline for the user's own order. Fetches on first
 * mount and memoises the result; if the order is brand-new and never shipped
 * there will be no events and the component renders a friendly empty state.
 */
export default function ShipmentTimeline({ orderId }: Props): JSX.Element {
  const [events, setEvents] = useState<ShipmentEvent[] | null>(
    () => eventsCache.get(orderId) ?? null,
  );

  useEffect(() => {
    const cached = eventsCache.get(orderId);
    if (cached) {
      setEvents(cached);
      return;
    }
    let cancelled = false;
    void fetchShipmentEvents(orderId)
      .then((evts) => {
        if (cancelled) return;
        eventsCache.set(orderId, evts);
        setEvents(evts);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (events === null) return <Spin size="small" />;
  if (events.length === 0) return <Empty description="暂无物流信息" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

  return (
    <Timeline
      items={events.map((e) => ({
        color: e.status === 'delivered' ? 'green' : 'blue',
        children: (
          <div>
            <Typography.Text strong>{SHIPMENT_STATUS_LABEL[e.status]}</Typography.Text>
            {e.location ? <Typography.Text> · {e.location}</Typography.Text> : null}
            {e.note ? (
              <div style={{ fontSize: 12, color: '#888' }}>{e.note}</div>
            ) : null}
            <div style={{ fontSize: 12, color: '#aaa' }}>
              {e.happenedAt.slice(0, 19).replace('T', ' ')}
            </div>
          </div>
        ),
      }))}
    />
  );
}
