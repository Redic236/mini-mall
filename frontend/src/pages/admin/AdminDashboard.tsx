import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { fetchAdminStats, type AdminStats } from '@/services/admin';
import { formatCNY } from '@/utils/format';

const TILE = (title: string, value: string | number, prefix?: string): JSX.Element => (
  <Card>
    <Statistic title={title} value={value} prefix={prefix} />
  </Card>
);

export default function AdminDashboard(): JSX.Element {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    void fetchAdminStats().then(setStats);
  }, []);

  if (!stats) return <div>加载中…</div>;

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        总览
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          {TILE('总订单数', stats.totalOrders)}
        </Col>
        <Col xs={24} sm={12} lg={8}>
          {TILE('今日订单', stats.todayOrders)}
        </Col>
        <Col xs={24} sm={12} lg={8}>
          {TILE('累计营收', formatCNY(stats.totalRevenue))}
        </Col>
        <Col xs={24} sm={12} lg={8}>
          {TILE('待发货订单', stats.pendingShipmentCount)}
        </Col>
        <Col xs={24} sm={12} lg={8}>
          {TILE('商品总数', stats.totalProducts)}
        </Col>
        <Col xs={24} sm={12} lg={8}>
          {TILE('低库存商品', stats.lowStockCount)}
        </Col>
      </Row>
    </div>
  );
}
