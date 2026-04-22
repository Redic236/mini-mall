import { useEffect, useState } from 'react';
import { Button, Empty, Radio, Space, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loadAddresses } from '@/store/slices/addressSlice';
import { loadCart } from '@/store/slices/cartSlice';
import { submitOrder } from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';

export default function OrderConfirm(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: addresses } = useAppSelector((s) => s.addresses);
  const { items, totalPrice } = useAppSelector((s) => s.cart);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    void dispatch(loadAddresses());
    void dispatch(loadCart());
  }, [dispatch]);

  useEffect(() => {
    if (selectedId === null && addresses.length > 0) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedId(def.id);
    }
  }, [addresses, selectedId]);

  const handleSubmit = async (): Promise<void> => {
    if (!selectedId) {
      message.warning('请先选择收货地址');
      return;
    }
    if (items.length === 0) {
      message.warning('购物车为空');
      return;
    }
    const cartItemIds = items.map((it) => it.id);
    const action = await dispatch(submitOrder({ addressId: selectedId, cartItemIds }));
    if (submitOrder.fulfilled.match(action)) {
      message.success('订单已创建');
      navigate('/orders');
    }
  };

  if (addresses.length === 0) {
    return (
      <Empty description="还没有收货地址">
        <Button type="primary" onClick={() => navigate('/addresses')}>
          去添加
        </Button>
      </Empty>
    );
  }

  return (
    <div>
      <h1 className="page-title">确认订单</h1>
      <Typography.Title level={5}>收货地址</Typography.Title>
      <Radio.Group value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        <Space direction="vertical">
          {addresses.map((a) => (
            <Radio key={a.id} value={a.id}>
              {a.name} {a.phone} — {a.province}{a.city}{a.district} {a.detail}
              {a.isDefault ? '（默认）' : ''}
            </Radio>
          ))}
        </Space>
      </Radio.Group>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        商品（{items.length} 件） 合计 ¥ {Number(totalPrice).toFixed(2)}
      </Typography.Title>

      <Button type="primary" onClick={handleSubmit} style={{ marginTop: 16 }}>
        提交订单
      </Button>
    </div>
  );
}
