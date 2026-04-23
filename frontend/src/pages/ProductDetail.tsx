import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Descriptions, Divider, InputNumber, Spin, message } from 'antd';
import { clearCurrent, loadProduct } from '@/store/slices/productSlice';
import { addToCart } from '@/store/slices/cartSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import ProductReviews from '@/components/ProductReviews';

export default function ProductDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { current } = useAppSelector((s) => s.products);
  const { user } = useAppSelector((s) => s.auth);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) void dispatch(loadProduct(Number(id)));
    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  if (!current) return <Spin />;

  const handleAdd = async (): Promise<void> => {
    if (!user) {
      message.info('请先登录');
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const action = await dispatch(addToCart({ productId: current.id, quantity }));
    if (addToCart.fulfilled.match(action)) {
      message.success('已加入购物车');
    }
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
        <Descriptions.Item label="分类">{current.category}</Descriptions.Item>
        <Descriptions.Item label="描述">{current.description ?? '—'}</Descriptions.Item>
      </Descriptions>
      <InputNumber min={1} max={current.stock} value={quantity} onChange={(v) => setQuantity(Number(v ?? 1))} />
      <Button type="primary" onClick={handleAdd} disabled={current.stock <= 0} style={{ marginLeft: 12 }}>
        加入购物车
      </Button>

      <Divider />
      <ProductReviews productId={current.id} />
    </div>
  );
}
