import { useEffect } from 'react';
import { Button, Empty, InputNumber, Popconfirm, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import { loadCart, removeCartItem, updateCartItem } from '@/store/slices/cartSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import type { CartItem } from '@/types';

export default function Cart(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, totalPrice, totalQuantity, loading } = useAppSelector((s) => s.cart);

  useEffect(() => {
    void dispatch(loadCart());
  }, [dispatch]);

  const columns: ColumnsType<CartItem> = [
    { title: '商品', dataIndex: ['product', 'name'], key: 'name' },
    {
      title: '单价',
      key: 'price',
      render: (_, r) => `¥ ${Number(r.product?.price ?? 0).toFixed(2)}`,
    },
    {
      title: '数量',
      key: 'quantity',
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
      render: (_, r) => `¥ ${(Number(r.product?.price ?? 0) * r.quantity).toFixed(2)}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, r) => (
        <Popconfirm title="确认删除？" onConfirm={() => void dispatch(removeCartItem(r.id))}>
          <Button danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  if (!loading && items.length === 0) {
    return (
      <Empty description="购物车是空的">
        <Link to="/">去逛逛</Link>
      </Empty>
    );
  }

  return (
    <div>
      <h1 className="page-title">购物车</h1>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={items} pagination={false} />
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
        <span>共 {totalQuantity} 件，合计：¥ {Number(totalPrice).toFixed(2)}</span>
        <Button type="primary" disabled={items.length === 0} onClick={() => navigate('/order-confirm')}>
          去结算
        </Button>
      </div>
    </div>
  );
}
