import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Result, Row, Skeleton, Statistic, Tooltip, Typography } from 'antd';
import {
  fetchAdminStats,
  fetchAdminStatsHistory,
  type AdminStats,
  type StatsHistory,
} from '@/services/admin';
import { formatCNY } from '@/utils/format';
import Sparkline from '@/components/Sparkline';

interface TileProps {
  title: string;
  value: string | number;
  series?: number[];
  seriesLabel?: string;
  color?: string;
}

function Tile({ title, value, series, seriesLabel, color }: TileProps): JSX.Element {
  return (
    <Card>
      <Statistic title={title} value={value} />
      {series && series.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Tooltip title={seriesLabel ?? '近 7 天趋势'}>
            <div>
              <Sparkline values={series} color={color} ariaLabel={seriesLabel} />
            </div>
          </Tooltip>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            近 7 天
          </Typography.Text>
        </div>
      )}
    </Card>
  );
}

export default function AdminDashboard(): JSX.Element {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [history, setHistory] = useState<StatsHistory | null>(null);
  const [statsError, setStatsError] = useState(false);

  const load = useCallback(() => {
    setStatsError(false);
    // Fire both requests in parallel — the dashboard renders tiles as soon
    // as stats resolves; sparklines light up when history lands. The history
    // call is best-effort: a failure there just leaves the sparkline row
    // empty. A failure on stats blocks the whole tile grid, so we expose a
    // retry affordance instead of leaving the user on a forever-skeleton.
    void fetchAdminStats()
      .then(setStats)
      .catch(() => setStatsError(true));
    void fetchAdminStatsHistory(7)
      .then(setHistory)
      .catch(() => {
        /* sparkline is best-effort; tiles still render */
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (statsError && !stats) {
    return (
      <Result
        status="warning"
        title="统计数据加载失败"
        subTitle="请检查网络后重试"
        extra={
          <Button type="primary" onClick={load}>
            重试
          </Button>
        }
      />
    );
  }

  if (!stats) {
    return (
      <div>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          总览
        </Typography.Title>
        <Row gutter={[16, 16]}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Col key={i} xs={24} sm={12} lg={8}>
              <Card>
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  const orderSeries = history?.ordersPerDay.map((p) => p.value);
  const revenueSeries = history?.revenuePerDay.map((p) => p.value);

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        总览
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Tile
            title="总订单数"
            value={stats.totalOrders}
            series={orderSeries}
            seriesLabel="最近 7 天每日新增订单"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Tile
            title="今日订单"
            value={stats.todayOrders}
            series={orderSeries}
            seriesLabel="最近 7 天每日订单数"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Tile
            title="累计营收"
            value={formatCNY(stats.totalRevenue)}
            series={revenueSeries}
            seriesLabel="最近 7 天每日营收（元）"
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Tile title="待发货订单" value={stats.pendingShipmentCount} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Tile title="商品总数" value={stats.totalProducts} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Tile title="低库存商品" value={stats.lowStockCount} />
        </Col>
      </Row>
    </div>
  );
}
