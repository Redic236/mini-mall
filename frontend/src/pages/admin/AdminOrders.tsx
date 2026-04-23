import { useCallback, useEffect, useState } from 'react';
import { Button, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { fetchAdminOrders, shipAdminOrder } from '@/services/admin';
import type { Order, OrderStatus } from '@/types';
import { ORDER_STATUS_VALUES } from '@/types';
import { formatCNY } from '@/utils/format';

const STATUS_COLOR: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'blue',
  已发货: 'cyan',
  已完成: 'green',
  已取消: 'default',
};

const PAGE_SIZE = 20;

export default function AdminOrders(): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total: t } = await fetchAdminOrders({ status, page, limit: PAGE_SIZE });
      setOrders(items);
      setTotal(t);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleShip = async (id: number): Promise<void> => {
    await shipAdminOrder(id);
    void message.success('已发货');
    await load();
  };

  const columns: ColumnsType<Order> = [
    { title: '订单号', dataIndex: 'orderNo', width: 260 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: OrderStatus) => <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
    },
    {
      title: '总额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (v: number) => formatCNY(v),
    },
    {
      title: '收件',
      key: 'receiver',
      render: (_, r) => (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {r.receiverName} {r.receiverPhone} — {r.province}
          {r.city}
          {r.district} {r.detailAddress}
        </Typography.Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (v: string | undefined) => (v ? v.slice(0, 19).replace('T', ' ') : '—'),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, r) =>
        r.status === '已支付' ? (
          <Popconfirm title="确认发货？" onConfirm={() => void handleShip(r.id)}>
            <Button type="primary" size="small">
              发货
            </Button>
          </Popconfirm>
        ) : null,
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          订单管理
        </Typography.Title>
        <Space>
          <Select<OrderStatus | undefined>
            allowClear
            placeholder="全部状态"
            style={{ width: 160 }}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={ORDER_STATUS_VALUES.map((s) => ({ label: s, value: s }))}
          />
        </Space>
      </div>

      <Table<Order>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={orders}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          onChange: setPage,
          showSizeChanger: false,
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
