import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Dropdown, Empty, List, Popconfirm, Select, Space, Tag, Typography, message } from 'antd';
import type { MenuProps } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  cancelOrderThunk,
  confirmOrderThunk,
  loadOrders,
  setStatusFilter,
} from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { ORDER_STATUS_VALUES, type Order, type OrderStatus } from '@/types';
import { formatCNY } from '@/utils/format';
import OrderCountdown from '@/components/OrderCountdown';
import { createPayIntent } from '@/services/payment';
import { stashPaymentSignatures } from '@/pages/Checkout';

const STATUS_COLOR: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'blue',
  已发货: 'cyan',
  已完成: 'green',
  已取消: 'default',
};

export default function OrderList(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list, loading, statusFilter } = useAppSelector((s) => s.orders);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);

  useEffect(() => {
    void dispatch(loadOrders(statusFilter ?? undefined));
  }, [dispatch, statusFilter]);

  const handleFilterChange = (value: OrderStatus | null): void => {
    dispatch(setStatusFilter(value));
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
        <Select<OrderStatus | null>
          allowClear
          placeholder="全部状态"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(v) => handleFilterChange(v ?? null)}
          options={ORDER_STATUS_VALUES.map((s) => ({ label: s, value: s }))}
        />
      </div>

      {!loading && list.length === 0 ? (
        <Empty description="暂无订单" />
      ) : (
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
                      </div>
                      <Typography.Text type="secondary" style={{ display: 'block' }}>
                        收件：{order.receiverName} {order.receiverPhone} — {order.province}
                        {order.city}{order.district} {order.detailAddress}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {order.items?.map((it) => `${it.product?.name ?? ''} × ${it.quantity}`).join(' / ')}
                      </Typography.Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
