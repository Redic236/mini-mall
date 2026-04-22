import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Descriptions, InputNumber, Spin, message } from 'antd';
import { clearCurrent, loadProduct } from '@/store/slices/productSlice';
import { addToCart } from '@/store/slices/cartSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';

export default function ProductDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { current } = useAppSelector((s) => s.products);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) void dispatch(loadProduct(Number(id)));
    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  if (!current) return <Spin />;

  const handleAdd = async (): Promise<void> => {
    await dispatch(addToCart({ productId: current.id, quantity }));
    message.success('已加入购物车');
  };

  return (
    <div>
      <h1 className="page-title">{current.name}</h1>
      {current.image && (
        <img src={current.image} alt={current.name} style={{ maxWidth: 400, display: 'block', marginBottom: 16 }} />
      )}
      <Descriptions bordered column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="价格">¥ {Number(current.price).toFixed(2)}</Descriptions.Item>
        <Descriptions.Item label="库存">{current.stock}</Descriptions.Item>
        <Descriptions.Item label="描述">{current.description ?? '—'}</Descriptions.Item>
      </Descriptions>
      <InputNumber min={1} max={current.stock} value={quantity} onChange={(v) => setQuantity(Number(v ?? 1))} />
      <Button type="primary" onClick={handleAdd} disabled={current.stock <= 0} style={{ marginLeft: 12 }}>
        加入购物车
      </Button>
    </div>
  );
}
