import { useEffect } from 'react';
import { Button, Empty, InputNumber, Popconfirm, Skeleton, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { loadCart, removeCartItem, updateCartItem } from '@/store/slices/cartSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import type { CartItem } from '@/types';
import { formatCNY } from '@/utils/format';

export default function Cart(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, totalPrice, totalQuantity, loading } = useAppSelector((s) => s.cart);

  useEffect(() => {
    void dispatch(loadCart());
  }, [dispatch]);

  const columns: ColumnsType<CartItem> = [
    { title: '商品', dataIndex: ['product', 'name'], key: 'name', width: 200 },
    {
      title: '单价',
      key: 'price',
      width: 100,
      render: (_, r) => formatCNY(r.product?.price ?? 0),
    },
    {
      title: '数量',
      key: 'quantity',
      width: 140,
      render: (_, r) => (
        <InputNumber
          min={1}
          max={r.product?.stock ?? 99}
          value={r.quantity}
          onChange={(v) => {
            void dispatch(updateCartItem({ id: r.id, quantity: Number(v ?? 1) }));
          }}
        />
      ),
    },
    {
      title: '小计',
      key: 'subtotal',
      width: 120,
      render: (_, r) => formatCNY(Number(r.product?.price ?? 0) * r.quantity),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, r) => (
        <Popconfirm title="确认删除？" onConfirm={() => void dispatch(removeCartItem(r.id))}>
          <Button danger size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // Initial load: show a skeleton instead of a flash of "empty cart" while
  // the cart GET is in flight (common on first session boot).
  if (loading && items.length === 0) {
    return (
      <div>
        <h1 className="page-title">购物车</h1>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="购物车是空的，挑几件喜欢的吧"
        >
          <Button type="primary" size="large" onClick={() => navigate('/')}>
            去逛逛
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">购物车</h1>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={false}
        scroll={{ x: 660 }}
      />
      <div
        style={{
          marginTop: 16,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span>
          共 {totalQuantity} 件，合计：<strong style={{ color: '#1677ff' }}>{formatCNY(totalPrice)}</strong>
        </span>
        <Button type="primary" disabled={items.length === 0} onClick={() => navigate('/order-confirm')}>
          去结算
        </Button>
      </div>
    </div>
  );
}
