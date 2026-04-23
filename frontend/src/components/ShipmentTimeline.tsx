import { useEffect, useState } from 'react';
import { Empty, Spin, Timeline, Typography } from 'antd';
import { fetchShipmentEvents } from '@/services/shipment';
import type { ShipmentEvent } from '@/types';
import { SHIPMENT_STATUS_LABEL } from '@/types';

interface Props {
  orderId: number;
}

/**
 * Read-only shipment timeline for the user's own order. Fetches on mount;
 * if the order is brand-new and never shipped there will be no events and
 * the component renders a friendly empty state.
 */
export default function ShipmentTimeline({ orderId }: Props): JSX.Element {
  const [events, setEvents] = useState<ShipmentEvent[] | null>(null);

  useEffect(() => {
    void fetchShipmentEvents(orderId).then(setEvents).catch(() => setEvents([]));
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
