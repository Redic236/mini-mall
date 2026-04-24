import { useEffect, useMemo } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  InputNumber,
  Pagination,
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
import { LOW_STOCK_BADGE } from '@/utils/stockThresholds';
import type { ProductSort } from '@/types';

const ALL_CATEGORIES_KEY = '__all__';

// Thresholds for the "热卖" / "仅剩 N 件" ribbons on product cards.
const HOT_SELLER_THRESHOLD = 10;
const LOW_STOCK_THRESHOLD = LOW_STOCK_BADGE;
// First N images get loading="eager" + fetchpriority="high" so the LCP
// candidate above the fold starts decoding immediately; everything below
// stays lazy.
const EAGER_IMAGE_COUNT = 4;

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

const DEFAULT_PAGE_SIZE = 20;

export default function Home(): JSX.Element {
  const dispatch = useAppDispatch();
  const { list, loading, categories, page, limit, total } = useAppSelector((s) => s.products);
  const [searchParams, setSearchParams] = useSearchParams();

  const keyword = searchParams.get('q') ?? '';
  const category = searchParams.get('cat') ?? '';
  const minPrice = parseOptionalNumber(searchParams.get('min'));
  const maxPrice = parseOptionalNumber(searchParams.get('max'));
  const sort = (searchParams.get('sort') as ProductSort | null) ?? 'default';
  const pageParam = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

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
        page: pageParam,
        limit: DEFAULT_PAGE_SIZE,
      }),
    );
  }, [dispatch, debouncedKeyword, category, debouncedMin, debouncedMax, sort, pageParam]);

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
    // Changing any filter resets pagination to page 1 — paginating stale
    // results on top of a new filter is confusing UX.
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handlePageChange = (nextPage: number): void => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtersActive =
    keyword.length > 0 ||
    category.length > 0 ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    sort !== 'default';

  const clearFilters = (): void => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div>
      <section className="home-hero" aria-label="首页 banner">
        <div className="home-hero__text">
          <span className="home-hero__eyebrow">🛍️ MINI MALL</span>
          <h1 className="home-hero__title">精选好物，直抵生活</h1>
          <p className="home-hero__subtitle">
            从日常穿搭到数码周边，一站配齐。领取平台优惠券，新用户下单立享减免。
          </p>
          <div className="home-hero__actions">
            <Link to="/coupons">
              <Button type="primary" size="large" style={{ background: '#fff', color: '#1677ff', borderColor: '#fff' }}>
                领券中心
              </Button>
            </Link>
            <Button
              size="large"
              ghost
              style={{ borderColor: 'rgba(255,255,255,0.7)', color: '#fff' }}
              onClick={() => document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth' })}
            >
              开始逛逛
            </Button>
          </div>
        </div>
      </section>

      <h2 className="page-title" id="product-grid">全部商品</h2>

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
        <Empty
          description={filtersActive ? '没有找到匹配的商品' : '暂无商品'}
          style={{ padding: '48px 0' }}
        >
          {filtersActive && <Button onClick={clearFilters}>清空筛选</Button>}
        </Empty>
      ) : (
        <>
        <Row gutter={[16, 16]}>
          {list.map((product, index) => {
            const rating = Number(product.averageRating ?? 0);
            const count = Number(product.reviewCount ?? 0);
            const sales = Number(product.salesCount ?? 0);
            const isHotSeller = sales >= HOT_SELLER_THRESHOLD;
            const isLowStock = product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
            const eager = index < EAGER_IMAGE_COUNT;

            return (
              <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                <Link to={`/products/${product.id}`}>
                  <Card
                    className="product-card"
                    hoverable
                    cover={
                      <div style={{ position: 'relative' }}>
                        {isHotSeller && (
                          <span className="product-card__badge product-card__badge--hot">
                            热卖 · {sales}+
                          </span>
                        )}
                        {!isHotSeller && isLowStock && (
                          <span className="product-card__badge product-card__badge--low-stock">
                            仅剩 {product.stock} 件
                          </span>
                        )}
                        {product.image ? (
                          <img
                            alt={product.name}
                            src={product.image}
                            style={{ height: 200, width: '100%', objectFit: 'cover', display: 'block' }}
                            loading={eager ? 'eager' : 'lazy'}
                            // React 18 does not recognise the camelCase
                            // `fetchPriority` prop (added in React 19), so
                            // spread the HTML-standard lowercase attribute
                            // via an object. "auto" is the browser default,
                            // so only emit the attribute when we want the
                            // LCP hint.
                            {...(eager ? { fetchpriority: 'high' as const } : {})}
                            decoding="async"
                            width={400}
                            height={200}
                          />
                        ) : (
                          <div
                            style={{
                              height: 200,
                              background: 'linear-gradient(135deg, #e6f4ff, #bae0ff)',
                            }}
                          />
                        )}
                      </div>
                    }
                  >
                    <Card.Meta
                      title={product.name}
                      description={
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Typography.Text strong style={{ color: '#1677ff', fontSize: 16 }}>
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
        {total > limit && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Pagination
              current={page}
              pageSize={limit}
              total={total}
              showSizeChanger={false}
              onChange={handlePageChange}
            />
          </div>
        )}
        </>
      )}
    </div>
  );
}
