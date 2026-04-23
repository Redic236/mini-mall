import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Button, Empty, List, Popconfirm, Select, Space, Tag, Typography, message } from 'antd';
import {
  cancelOrderThunk,
  confirmOrderThunk,
  loadOrders,
  payOrderThunk,
  setStatusFilter,
  shipOrderThunk,
} from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { ORDER_STATUS_VALUES, type Order, type OrderStatus } from '@/types';

const STATUS_COLOR: Record<OrderStatus, string> = {
  待支付: 'orange',
  已支付: 'blue',
  已发货: 'cyan',
  已完成: 'green',
  已取消: 'default',
};

export default function OrderList(): JSX.Element {
  const dispatch = useAppDispatch();
  const { list, loading, statusFilter } = useAppSelector((s) => s.orders);

  useEffect(() => {
    void dispatch(loadOrders(statusFilter ?? undefined));
  }, [dispatch, statusFilter]);

  const handleFilterChange = (value: OrderStatus | null): void => {
    dispatch(setStatusFilter(value));
  };

  const actionsFor = (order: Order): ReactNode[] => {
    const toast = (msg: string): void => {
      void message.success(msg);
    };
    switch (order.status) {
      case '待支付':
        return [
          <Button
            key="pay"
            type="primary"
            onClick={async () => {
              await dispatch(payOrderThunk(order.id));
              toast('已支付');
            }}
          >
            支付
          </Button>,
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
      case '已支付':
        return [
          <Button
            key="ship"
            onClick={async () => {
              await dispatch(shipOrderThunk(order.id));
              toast('已发货');
            }}
          >
            发货（管理）
          </Button>,
        ];
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
                    <Space>
                      <span>单号 {order.orderNo}</span>
                      <Tag color={STATUS_COLOR[order.status]}>{order.status}</Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div>总额：¥ {Number(order.totalAmount).toFixed(2)}</div>
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
