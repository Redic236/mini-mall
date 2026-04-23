import { useEffect, useMemo } from 'react';
import { Card, Col, Empty, Input, Row, Segmented, Spin } from 'antd';
import { Link, useSearchParams } from 'react-router-dom';
import { loadCategories, loadProducts } from '@/store/slices/productSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const ALL_CATEGORIES_KEY = '__all__';

export default function Home(): JSX.Element {
  const dispatch = useAppDispatch();
  const { list, loading, categories } = useAppSelector((s) => s.products);
  const [searchParams, setSearchParams] = useSearchParams();

  const keyword = searchParams.get('q') ?? '';
  const category = searchParams.get('cat') ?? '';
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  useEffect(() => {
    void dispatch(loadCategories());
  }, [dispatch]);

  useEffect(() => {
    void dispatch(
      loadProducts({
        keyword: debouncedKeyword || undefined,
        category: category || undefined,
      }),
    );
  }, [dispatch, debouncedKeyword, category]);

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

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search
          allowClear
          placeholder="搜索商品名称或描述"
          value={keyword}
          onChange={(e) => updateParam('q', e.target.value || null)}
          style={{ maxWidth: 360 }}
        />
        <Segmented
          value={category || ALL_CATEGORIES_KEY}
          onChange={(v) => updateParam('cat', v === ALL_CATEGORIES_KEY ? null : String(v))}
          options={categoryOptions}
        />
      </div>

      {loading ? (
        <Spin />
      ) : list.length === 0 ? (
        <Empty description="没有找到匹配的商品" />
      ) : (
        <Row gutter={[16, 16]}>
          {list.map((product) => (
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
                      />
                    ) : undefined
                  }
                >
                  <Card.Meta
                    title={product.name}
                    description={
                      <>
                        <div>¥ {Number(product.price).toFixed(2)}</div>
                        <div style={{ color: '#8c8c8c', fontSize: 12 }}>{product.category}</div>
                      </>
                    }
                  />
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
