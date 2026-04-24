import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Descriptions,
  Divider,
  InputNumber,
  Rate,
  Result,
  Skeleton,
  Space,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { clearCurrent, loadProduct } from '@/store/slices/productSlice';
import { addToCart } from '@/store/slices/cartSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import ProductReviews from '@/components/ProductReviews';
import ProductRecommendations from '@/components/ProductRecommendations';
import { formatCNY } from '@/utils/format';

export default function ProductDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const current = useAppSelector((s) => s.products.current);
  const user = useAppSelector((s) => s.auth.user);
  const [quantity, setQuantity] = useState(1);

  const productId = id === undefined ? NaN : Number(id);
  const isValidId = Number.isInteger(productId) && productId > 0;

  useEffect(() => {
    if (isValidId) void dispatch(loadProduct(productId));
    return () => {
      dispatch(clearCurrent());
    };
  }, [productId, isValidId, dispatch]);

  if (!isValidId) {
    return (
      <Result
        status="404"
        title="商品不存在"
        subTitle="该商品链接无效或已被下架"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    );
  }

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

  const isDirectVisit = location.key === 'default';

  const handleBack = (): void => {
    // Prefer history.back when we arrived via an in-app navigation — that
    // restores the home page's filter / pagination / scroll state. On a
    // direct-link visit (location.key === 'default'), just go to /.
    if (!isDirectVisit) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div>
      <Button
        size="large"
        icon={<ArrowLeftOutlined />}
        onClick={handleBack}
        style={{ marginBottom: 16 }}
      >
        {isDirectVisit ? '返回首页' : '返回'}
      </Button>
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
      <ProductRecommendations productId={current.id} />

      <Divider />
      <ProductReviews productId={current.id} />
    </div>
  );
}
