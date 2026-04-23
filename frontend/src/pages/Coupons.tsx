import { useEffect, useState } from 'react';
import { Card, Col, Empty, Row, Tag, Typography, message } from 'antd';
import { fetchPublicCoupons } from '@/services/coupon';
import type { Coupon } from '@/types';
import { formatCNY } from '@/utils/format';

export default function Coupons(): JSX.Element {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setCoupons(await fetchPublicCoupons());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copy = async (code: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      void message.success(`已复制：${code}`);
    } catch {
      void message.warning('复制失败，请手动复制');
    }
  };

  return (
    <div>
      <h1 className="page-title">优惠券</h1>
      {loading ? null : coupons.length === 0 ? (
        <Empty description="暂无可用优惠券" />
      ) : (
        <Row gutter={[16, 16]}>
          {coupons.map((c) => (
            <Col key={c.id} xs={24} sm={12} md={8}>
              <Card hoverable onClick={() => void copy(c.code)} style={{ cursor: 'copy' }}>
                <Typography.Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
                  {c.type === 'fixed' ? `¥${Number(c.value).toFixed(0)}` : `${c.value}%`}
                  <Typography.Text style={{ fontSize: 14, marginLeft: 8 }} type="secondary">
                    {c.type === 'fixed' ? '立减' : '折扣'}
                  </Typography.Text>
                </Typography.Title>
                <Typography.Paragraph style={{ margin: '8px 0 0 0' }}>{c.name}</Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {Number(c.minOrderAmount) > 0
                    ? `满 ${formatCNY(c.minOrderAmount)} 可用`
                    : '无门槛'}
                </Typography.Text>
                <div style={{ marginTop: 12 }}>
                  <Tag color="blue" style={{ fontFamily: 'monospace' }}>
                    {c.code}
                  </Tag>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    点击复制
                  </Typography.Text>
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                  有效期至 {c.expiresAt.slice(0, 10)}
                </Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
