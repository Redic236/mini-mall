import { useEffect, useState } from 'react';
import { Card, Col, Row, Skeleton, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { fetchRecommendations, type ProductRecommendation } from '@/services/product';
import { formatCNY } from '@/utils/format';

interface Props {
  productId: number;
}

/**
 * "Users who bought X also bought Y" rail. Falls back to same-category top
 * sellers on a cold start; we surface the source as a small tag so it's
 * obvious when a rec is CF-driven vs. fallback.
 */
export default function ProductRecommendations({ productId }: Props): JSX.Element | null {
  const [recs, setRecs] = useState<ProductRecommendation[] | null>(null);

  useEffect(() => {
    setRecs(null);
    void fetchRecommendations(productId)
      .then(setRecs)
      .catch(() => setRecs([]));
  }, [productId]);

  if (recs === null) {
    return (
      <Row gutter={[12, 12]}>
        {[0, 1, 2, 3].map((i) => (
          <Col key={i} xs={12} sm={8} md={6}>
            <Skeleton.Image active style={{ width: '100%', height: 120 }} />
          </Col>
        ))}
      </Row>
    );
  }
  if (recs.length === 0) return null;

  const source = recs[0]?.source;

  return (
    <div style={{ marginTop: 32 }}>
      <Typography.Title level={4} style={{ marginBottom: 12 }}>
        猜你喜欢
        {source === 'category-fallback' && (
          <Tag color="default" style={{ marginLeft: 8, fontSize: 12 }}>
            同类热卖
          </Tag>
        )}
      </Typography.Title>
      <Row gutter={[12, 12]}>
        {recs.map((r) => (
          <Col key={r.product.id} xs={12} sm={8} md={6}>
            <Link to={`/products/${r.product.id}`}>
              <Card
                hoverable
                size="small"
                cover={
                  r.product.image ? (
                    <img
                      alt={r.product.name}
                      src={r.product.image}
                      style={{ height: 140, objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : undefined
                }
              >
                <Card.Meta
                  title={
                    <Typography.Text ellipsis style={{ fontSize: 13 }}>
                      {r.product.name}
                    </Typography.Text>
                  }
                  description={
                    <Typography.Text strong style={{ color: '#1677ff', fontSize: 13 }}>
                      {formatCNY(r.product.price)}
                    </Typography.Text>
                  }
                />
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
