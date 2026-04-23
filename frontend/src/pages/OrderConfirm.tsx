import { useEffect, useState } from 'react';
import { Button, Empty, Input, Radio, Space, Tag, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loadAddresses } from '@/store/slices/addressSlice';
import { loadCart } from '@/store/slices/cartSlice';
import { submitOrder } from '@/store/slices/orderSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { formatCNY } from '@/utils/format';
import { previewCoupon } from '@/services/coupon';
import type { CouponPreview } from '@/types';

export default function OrderConfirm(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: addresses } = useAppSelector((s) => s.addresses);
  const { items, totalPrice } = useAppSelector((s) => s.cart);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

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

  const handleApplyCoupon = async (): Promise<void> => {
    const code = couponCode.trim();
    if (!code) {
      setCoupon(null);
      return;
    }
    setCouponChecking(true);
    try {
      const preview = await previewCoupon(code, totalPrice);
      setCoupon(preview);
      message.success(`已应用：${preview.name}，减免 ${formatCNY(preview.discountAmount)}`);
    } catch {
      setCoupon(null);
      // http interceptor surfaces the error toast
    } finally {
      setCouponChecking(false);
    }
  };

  const handleClearCoupon = (): void => {
    setCoupon(null);
    setCouponCode('');
  };

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
    const action = await dispatch(
      submitOrder({
        addressId: selectedId,
        cartItemIds,
        ...(coupon ? { couponCode: coupon.code } : {}),
      }),
    );
    if (submitOrder.fulfilled.match(action)) {
      message.success('订单已创建');
      navigate('/orders');
    }
  };

  const finalTotal = coupon ? coupon.finalAmount : totalPrice;

  if (addresses.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="还没有收货地址，添加一个才能下单"
        >
          <Button type="primary" onClick={() => navigate('/addresses')}>
            去添加
          </Button>
        </Empty>
      </div>
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
        优惠券
      </Typography.Title>
      {coupon ? (
        <Space>
          <Tag color="blue">
            {coupon.code} · {coupon.name}
          </Tag>
          <span style={{ color: '#52c41a' }}>-{formatCNY(coupon.discountAmount)}</span>
          <Button size="small" onClick={handleClearCoupon}>
            更换
          </Button>
        </Space>
      ) : (
        <Space>
          <Input
            placeholder="输入优惠券码"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            style={{ width: 200 }}
            onPressEnter={() => void handleApplyCoupon()}
          />
          <Button loading={couponChecking} onClick={() => void handleApplyCoupon()}>
            应用
          </Button>
        </Space>
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        商品（{items.length} 件）
      </Typography.Title>
      <Space direction="vertical" size={4}>
        <span>
          小计：<span>{formatCNY(totalPrice)}</span>
        </span>
        {coupon && (
          <span>
            优惠：<span style={{ color: '#52c41a' }}>-{formatCNY(coupon.discountAmount)}</span>
          </span>
        )}
        <span>
          应付：
          <span style={{ color: '#1677ff', fontSize: 20, fontWeight: 600 }}>
            {formatCNY(finalTotal)}
          </span>
        </span>
      </Space>

      <div>
        <Button type="primary" onClick={handleSubmit} style={{ marginTop: 16 }}>
          提交订单
        </Button>
      </div>
    </div>
  );
}
