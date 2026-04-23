import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { fetchAdminOrders, shipAdminOrder } from '@/services/admin';
import {
  addAdminShipmentEvent,
  fetchAdminShipmentEvents,
  type ShipmentEventInput,
} from '@/services/shipment';
import type { Order, OrderStatus, ShipmentEvent, ShipmentStatus } from '@/types';
import { ORDER_STATUS_VALUES, SHIPMENT_STATUS_LABEL } from '@/types';
import { formatCNY } from '@/utils/format';

const STATUS_COLOR: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'blue',
  已发货: 'cyan',
  已完成: 'green',
  已取消: 'default',
};

const PAGE_SIZE = 20;

interface ShipmentModalState {
  orderId: number | null;
  events: ShipmentEvent[];
  loading: boolean;
}

export default function AdminOrders(): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [shipmentModal, setShipmentModal] = useState<ShipmentModalState>({
    orderId: null,
    events: [],
    loading: false,
  });
  const [shipmentForm] = Form.useForm<ShipmentEventInput>();

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

  const openShipmentModal = async (orderId: number): Promise<void> => {
    setShipmentModal({ orderId, events: [], loading: true });
    shipmentForm.resetFields();
    try {
      const events = await fetchAdminShipmentEvents(orderId);
      setShipmentModal({ orderId, events, loading: false });
    } catch {
      setShipmentModal({ orderId, events: [], loading: false });
    }
  };

  const closeShipmentModal = (): void => {
    setShipmentModal({ orderId: null, events: [], loading: false });
  };

  const handleAddShipmentEvent = async (): Promise<void> => {
    if (shipmentModal.orderId === null) return;
    const values = await shipmentForm.validateFields();
    await addAdminShipmentEvent(shipmentModal.orderId, {
      status: values.status,
      location: values.location?.trim() || null,
      note: values.note?.trim() || null,
    });
    void message.success('已添加');
    // Reload events in-place.
    const events = await fetchAdminShipmentEvents(shipmentModal.orderId);
    setShipmentModal((prev) => ({ ...prev, events }));
    shipmentForm.resetFields();
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
      width: 180,
      render: (_, r) => (
        <Space>
          {r.status === '已支付' && (
            <Popconfirm title="确认发货？" onConfirm={() => void handleShip(r.id)}>
              <Button type="primary" size="small">
                发货
              </Button>
            </Popconfirm>
          )}
          {(r.status === '已发货' || r.status === '已完成') && (
            <Button size="small" onClick={() => void openShipmentModal(r.id)}>
              物流
            </Button>
          )}
        </Space>
      ),
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

      <Modal
        title={shipmentModal.orderId ? `订单 #${shipmentModal.orderId} 物流轨迹` : '物流轨迹'}
        open={shipmentModal.orderId !== null}
        onCancel={closeShipmentModal}
        footer={<Button onClick={closeShipmentModal}>关闭</Button>}
        width={600}
        destroyOnClose
      >
        <Typography.Title level={5}>现有节点</Typography.Title>
        {shipmentModal.loading ? (
          <Spin />
        ) : shipmentModal.events.length === 0 ? (
          <Empty description="暂无节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Timeline
            items={shipmentModal.events.map((e) => ({
              color: e.status === 'delivered' ? 'green' : 'blue',
              children: (
                <div>
                  <Typography.Text strong>{SHIPMENT_STATUS_LABEL[e.status]}</Typography.Text>
                  {e.location ? <span> · {e.location}</span> : null}
                  {e.note ? <div style={{ fontSize: 12, color: '#888' }}>{e.note}</div> : null}
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {e.happenedAt.slice(0, 19).replace('T', ' ')}
                  </div>
                </div>
              ),
            }))}
          />
        )}

        <Typography.Title level={5} style={{ marginTop: 16 }}>
          添加节点
        </Typography.Title>
        <Form<ShipmentEventInput> form={shipmentForm} layout="vertical">
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select<ShipmentStatus>
              options={(Object.keys(SHIPMENT_STATUS_LABEL) as ShipmentStatus[]).map((s) => ({
                value: s,
                label: SHIPMENT_STATUS_LABEL[s],
              }))}
              placeholder="选择状态"
            />
          </Form.Item>
          <Form.Item name="location" label="位置" rules={[{ max: 100 }]}>
            <Input placeholder="例如 上海分拣中心" />
          </Form.Item>
          <Form.Item name="note" label="备注" rules={[{ max: 255 }]}>
            <Input placeholder="例如 已发往杭州" />
          </Form.Item>
          <Button type="primary" onClick={() => void handleAddShipmentEvent()}>
            添加
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
