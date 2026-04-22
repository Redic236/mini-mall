import { useEffect } from 'react';
import { Card, Col, Empty, Row, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { loadProducts } from '@/store/slices/productSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';

export default function Home(): JSX.Element {
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.products);

  useEffect(() => {
    void dispatch(loadProducts());
  }, [dispatch]);

  if (loading) return <Spin />;
  if (list.length === 0) return <Empty description="暂无商品" />;

  return (
    <div>
      <h1 className="page-title">全部商品</h1>
      <Row gutter={[16, 16]}>
        {list.map((product) => (
          <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
            <Link to={`/products/${product.id}`}>
              <Card
                hoverable
                cover={
                  product.image ? (
                    <img alt={product.name} src={product.image} style={{ height: 200, objectFit: 'cover' }} />
                  ) : undefined
                }
              >
                <Card.Meta title={product.name} description={`¥ ${Number(product.price).toFixed(2)}`} />
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
