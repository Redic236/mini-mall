import { useEffect, useMemo } from 'react';
import {
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  Rate,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { loadCategories, loadProducts } from '@/store/slices/productSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatCNY } from '@/utils/format';
import type { ProductSort } from '@/types';

const ALL_CATEGORIES_KEY = '__all__';

const SORT_OPTIONS: Array<{ label: string; value: ProductSort }> = [
  { label: '默认排序', value: 'default' },
  { label: '价格从低到高', value: 'priceAsc' },
  { label: '价格从高到低', value: 'priceDesc' },
  { label: '销量优先', value: 'sales' },
];

function parseOptionalNumber(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default function Home(): JSX.Element {
  const dispatch = useAppDispatch();
  const { list, loading, categories } = useAppSelector((s) => s.products);
  const [searchParams, setSearchParams] = useSearchParams();

  const keyword = searchParams.get('q') ?? '';
  const category = searchParams.get('cat') ?? '';
  const minPrice = parseOptionalNumber(searchParams.get('min'));
  const maxPrice = parseOptionalNumber(searchParams.get('max'));
  const sort = (searchParams.get('sort') as ProductSort | null) ?? 'default';

  const debouncedKeyword = useDebouncedValue(keyword, 300);
  const debouncedMin = useDebouncedValue(minPrice, 400);
  const debouncedMax = useDebouncedValue(maxPrice, 400);

  useEffect(() => {
    void dispatch(loadCategories());
  }, [dispatch]);

  useEffect(() => {
    void dispatch(
      loadProducts({
        keyword: debouncedKeyword || undefined,
        category: category || undefined,
        minPrice: debouncedMin,
        maxPrice: debouncedMax,
        sort,
      }),
    );
  }, [dispatch, debouncedKeyword, category, debouncedMin, debouncedMax, sort]);

  const categoryOptions = useMemo(
    () => [
      { label: '全部', value: ALL_CATEGORIES_KEY },
      ...categories.map((c) => ({
        label: `${c.category} (${c.count})`,
        value: c.category,
      })),
    ],
    [categories],
  );

  const updateParam = (key: string, value: string | null): void => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <h1 className="page-title">全部商品</h1>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Input.Search
          allowClear
          placeholder="搜索商品名称或描述"
          value={keyword}
          onChange={(e) => updateParam('q', e.target.value || null)}
          style={{ width: '100%', maxWidth: 360 }}
        />
        <Segmented
          value={category || ALL_CATEGORIES_KEY}
          onChange={(v) => updateParam('cat', v === ALL_CATEGORIES_KEY ? null : String(v))}
          options={categoryOptions}
        />
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Space size={8}>
          <Typography.Text type="secondary">价格</Typography.Text>
          <InputNumber
            min={0}
            placeholder="最低"
            value={minPrice}
            onChange={(v) => updateParam('min', v !== null && v !== undefined ? String(v) : null)}
            style={{ width: 100 }}
          />
          <span>—</span>
          <InputNumber
            min={0}
            placeholder="最高"
            value={maxPrice}
            onChange={(v) => updateParam('max', v !== null && v !== undefined ? String(v) : null)}
            style={{ width: 100 }}
          />
        </Space>
        <Select<ProductSort>
          value={sort}
          onChange={(v) => updateParam('sort', v === 'default' ? null : v)}
          options={SORT_OPTIONS}
          style={{ width: 160 }}
        />
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Col key={i} xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Skeleton.Image style={{ width: '100%', height: 200 }} active />
                <Skeleton active paragraph={{ rows: 1 }} style={{ marginTop: 16 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : list.length === 0 ? (
        <Empty description="没有找到匹配的商品" />
      ) : (
        <Row gutter={[16, 16]}>
          {list.map((product) => {
            const rating = Number(product.averageRating ?? 0);
            const count = Number(product.reviewCount ?? 0);
            return (
              <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                <Link to={`/products/${product.id}`}>
                  <Card
                    hoverable
                    cover={
                      product.image ? (
                        <img
                          alt={product.name}
                          src={product.image}
                          style={{ height: 200, objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ) : undefined
                    }
                  >
                    <Card.Meta
                      title={product.name}
                      description={
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Typography.Text strong style={{ color: '#1677ff' }}>
                            {formatCNY(product.price)}
                          </Typography.Text>
                          <Space size={6}>
                            <Rate
                              disabled
                              allowHalf
                              value={rating}
                              style={{ fontSize: 12 }}
                            />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {count === 0 ? '暂无评价' : `${rating.toFixed(1)} · ${count} 条`}
                            </Typography.Text>
                          </Space>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {product.category}
                          </Typography.Text>
                        </Space>
                      }
                    />
                  </Card>
                </Link>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
