import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button,
  Collapse,
  Dropdown,
  Empty,
  List,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  bulkDeleteCompletedThunk,
  cancelOrderThunk,
  confirmOrderThunk,
  deleteOrderThunk,
  loadOrders,
  setPage,
  setStatusFilter,
} from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { ORDER_STATUS_VALUES, type Order, type OrderStatus } from '@/types';
import { formatCNY } from '@/utils/format';
import OrderCountdown from '@/components/OrderCountdown';
import { createPayIntent } from '@/services/payment';
import { stashPaymentSignatures } from '@/pages/Checkout';
import ShipmentTimeline from '@/components/ShipmentTimeline';

const STATUS_COLOR: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'blue',
  已发货: 'cyan',
  已完成: 'green',
  已取消: 'default',
};

// Only finalised orders are user-deletable. Active ones (待支付 / 已支付 /
// 已发货) stay in the list because the merchant is still on the hook.
const USER_DELETABLE: ReadonlySet<OrderStatus> = new Set(['已完成', '已取消']);

// Sentinel used by the "全部" option in the status Select. Empty string so
// antd can keep value-based comparisons simple; mapped to `null` on the way
// into the redux store.
const ALL_STATUSES = '' as const;
type StatusFilterValue = OrderStatus | typeof ALL_STATUSES;

export default function OrderList(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading, statusFilter, page, limit, total } = useAppSelector((s) => s.orders);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);

  useEffect(() => {
    void dispatch(loadOrders({ status: statusFilter ?? undefined, page, limit }));
  }, [dispatch, statusFilter, page, limit]);

  const handleFilterChange = (value: StatusFilterValue): void => {
    dispatch(setStatusFilter(value === ALL_STATUSES ? null : value));
  };

  const handlePageChange = (next: number): void => {
    dispatch(setPage(next));
  };

  const handleDelete = async (order: Order): Promise<void> => {
    await dispatch(deleteOrderThunk(order.id));
    void message.success('订单已删除');
  };

  const handleBulkClear = async (): Promise<void> => {
    const result = await dispatch(bulkDeleteCompletedThunk());
    if (bulkDeleteCompletedThunk.fulfilled.match(result)) {
      const affected = result.payload;
      void message.success(
        affected === 0 ? '没有可清空的历史订单' : `已清空 ${affected} 条历史订单`,
      );
    }
  };

  const startPayment = async (
    order: Order,
    method: 'alipay_sandbox' | 'wechat_sandbox',
  ): Promise<void> => {
    setPayingOrderId(order.id);
    try {
      const intent = await createPayIntent(order.id, method);
      stashPaymentSignatures(intent.paymentId, intent.amount, intent.debugSignatures);
      navigate(intent.gatewayUrl);
    } catch {
      // http interceptor surfaces the error toast
    } finally {
      setPayingOrderId(null);
    }
  };

  const actionsFor = (order: Order): ReactNode[] => {
    const toast = (msg: string): void => {
      void message.success(msg);
    };
    switch (order.status) {
      case '待支付': {
        const payMethods: MenuProps['items'] = [
          { key: 'alipay', label: '支付宝（沙箱）', onClick: () => void startPayment(order, 'alipay_sandbox') },
          { key: 'wechat', label: '微信支付（沙箱）', onClick: () => void startPayment(order, 'wechat_sandbox') },
        ];
        return [
          <Dropdown key="pay" menu={{ items: payMethods }} placement="bottomRight">
            <Button type="primary" loading={payingOrderId === order.id}>
              去支付
            </Button>
          </Dropdown>,
          <Popconfirm
            key="cancel"
            title="确认取消此订单？"
            onConfirm={async () => {
              await dispatch(cancelOrderThunk(order.id));
              toast('已取消');
            }}
          >
            <Button danger>取消订单</Button>
          </Popconfirm>,
        ];
      }
      case '已支付':
        // Shipping is an admin action; user view just waits for the update.
        return [];
      case '已发货':
        return [
          <Button
            key="confirm"
            type="primary"
            onClick={async () => {
              await dispatch(confirmOrderThunk(order.id));
              toast('已确认收货');
            }}
          >
            确认收货
          </Button>,
        ];
      case '已完成':
      case '已取消':
        return [
          <Popconfirm
            key="delete"
            title="确认删除此订单？删除后将从列表中移除，无法恢复"
            okText="删除"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDelete(order)}
          >
            <Tooltip title="删除订单">
              <Button
                danger
                type="primary"
                shape="circle"
                icon={<DeleteOutlined />}
                aria-label="删除订单"
              />
            </Tooltip>
          </Popconfirm>,
        ];
      default:
        return [];
    }
  };

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
        <h1 className="page-title" style={{ margin: 0 }}>我的订单</h1>
        <Space wrap size={8}>
          <Popconfirm
            title="清空所有已完成和已取消的订单？该操作不可恢复"
            okText="清空"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleBulkClear()}
            disabled={list.every((o) => !USER_DELETABLE.has(o.status))}
          >
            <Button
              danger
              disabled={list.every((o) => !USER_DELETABLE.has(o.status))}
            >
              清空历史
            </Button>
          </Popconfirm>
          <Select<StatusFilterValue>
            style={{ width: 160 }}
            value={statusFilter ?? ALL_STATUSES}
            onChange={handleFilterChange}
            options={[
              { label: '全部', value: ALL_STATUSES },
              ...ORDER_STATUS_VALUES.map((s) => ({ label: s, value: s })),
            ]}
          />
        </Space>
      </div>

      {!loading && list.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={statusFilter ? `没有${statusFilter}的订单` : '还没有订单，先逛逛？'}
          >
            <Button type="primary" onClick={() => navigate('/')}>
              去购物
            </Button>
          </Empty>
        </div>
      ) : (
        <>
        <List
          loading={loading}
          dataSource={list}
          renderItem={(order) => {
            const actions = actionsFor(order);
            return (
              <List.Item key={order.id} actions={actions.length > 0 ? actions : undefined}>
                <List.Item.Meta
                  title={
                    <Space wrap size={8}>
                      <span>单号 {order.orderNo}</span>
                      <Tag color={STATUS_COLOR[order.status]}>{order.status}</Tag>
                      {order.status === '待支付' && <OrderCountdown createdAt={order.createdAt} />}
                    </Space>
                  }
                  description={
                    <div>
                      <div>
                        总额：<strong style={{ color: '#1677ff' }}>{formatCNY(order.totalAmount)}</strong>
                        {order.discountAmount > 0 && (
                          <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            (优惠 -{formatCNY(order.discountAmount)})
                          </Typography.Text>
                        )}
                      </div>
                      <Typography.Text type="secondary" style={{ display: 'block' }}>
                        收件：{order.receiverName} {order.receiverPhone} — {order.province}
                        {order.city}{order.district} {order.detailAddress}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {order.items?.map((it) => `${it.product?.name ?? ''} × ${it.quantity}`).join(' / ')}
                      </Typography.Text>
                      {(order.status === '已发货' || order.status === '已完成') && (
                        <Collapse
                          ghost
                          size="small"
                          style={{ marginTop: 8 }}
                          items={[
                            {
                              key: 'shipment',
                              label: '查看物流',
                              children: <ShipmentTimeline orderId={order.id} />,
                            },
                          ]}
                        />
                      )}
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
        {total > limit && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Pagination
              current={page}
              pageSize={limit}
              total={total}
              showSizeChanger={false}
              onChange={handlePageChange}
            />
          </div>
        )}
        </>
      )}
    </div>
  );
}
