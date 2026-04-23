import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Descriptions,
  Divider,
  InputNumber,
  Rate,
  Skeleton,
  Space,
  Typography,
  message,
} from 'antd';
import { clearCurrent, loadProduct } from '@/store/slices/productSlice';
import { addToCart } from '@/store/slices/cartSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import ProductReviews from '@/components/ProductReviews';
import { formatCNY } from '@/utils/format';

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

  if (!current) {
    return (
      <div>
        <Skeleton.Image style={{ width: 400, height: 300 }} active />
        <Skeleton active style={{ marginTop: 24 }} paragraph={{ rows: 4 }} />
      </div>
    );
  }

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

  const rating = Number(current.averageRating ?? 0);
  const reviewCount = Number(current.reviewCount ?? 0);

  return (
    <div>
      <h1 className="page-title">{current.name}</h1>
      <Space align="center" size={12} style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <Rate disabled allowHalf value={rating} />
        <Typography.Text type="secondary">
          {reviewCount === 0 ? '暂无评价' : `${rating.toFixed(1)} 分 · ${reviewCount} 条评价`}
        </Typography.Text>
      </Space>
      {current.image && (
        <img
          src={current.image}
          alt={current.name}
          style={{
            maxWidth: '100%',
            width: 400,
            display: 'block',
            marginBottom: 16,
            borderRadius: 8,
          }}
          loading="lazy"
        />
      )}
      <Descriptions bordered column={1} style={{ marginBottom: 16 }} size="small">
        <Descriptions.Item label="价格">
          <Typography.Text strong style={{ color: '#1677ff' }}>
            {formatCNY(current.price)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="库存">{current.stock}</Descriptions.Item>
        <Descriptions.Item label="分类">{current.category}</Descriptions.Item>
        <Descriptions.Item label="描述">{current.description ?? '—'}</Descriptions.Item>
      </Descriptions>
      <Space wrap>
        <InputNumber
          min={1}
          max={current.stock}
          value={quantity}
          onChange={(v) => setQuantity(Number(v ?? 1))}
        />
        <Button type="primary" onClick={handleAdd} disabled={current.stock <= 0}>
          加入购物车
        </Button>
      </Space>

      <Divider />
      <ProductReviews productId={current.id} />
    </div>
  );
}
