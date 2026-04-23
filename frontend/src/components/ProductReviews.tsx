import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  List,
  Pagination,
  Popconfirm,
  Rate,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import {
  createReview,
  deleteReview,
  fetchEligibility,
  fetchReviews,
  updateReview,
} from '@/services/review';
import { useAppSelector } from '@/store/store';
import type { Review, ReviewEligibility, ReviewListResult } from '@/types';

const PAGE_SIZE = 5;

interface ProductReviewsProps {
  productId: number;
}

interface ReviewFormValues {
  rating: number;
  content?: string;
}

export default function ProductReviews({ productId }: ProductReviewsProps): JSX.Element {
  const { user } = useAppSelector((s) => s.auth);
  const [list, setList] = useState<ReviewListResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm<ReviewFormValues>();

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReviews(productId, page, PAGE_SIZE);
      setList(data);
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  const loadEligibility = useCallback(async () => {
    if (!user) {
      setEligibility(null);
      return;
    }
    try {
      const data = await fetchEligibility(productId);
      setEligibility(data);
    } catch {
      setEligibility(null);
    }
  }, [productId, user]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    void loadEligibility();
  }, [loadEligibility]);

  const ownReview: Review | undefined = list?.items.find((r) => r.userId === user?.id);

  const handleCreate = async (values: ReviewFormValues): Promise<void> => {
    await createReview({ productId, rating: values.rating, content: values.content });
    message.success('评价已发布');
    form.resetFields();
    setPage(1);
    await Promise.all([loadReviews(), loadEligibility()]);
  };

  const handleStartEdit = (review: Review): void => {
    setEditingId(review.id);
    form.setFieldsValue({ rating: review.rating, content: review.content ?? '' });
  };

  const handleSaveEdit = async (values: ReviewFormValues): Promise<void> => {
    if (editingId === null) return;
    await updateReview(editingId, { rating: values.rating, content: values.content });
    message.success('已更新');
    setEditingId(null);
    form.resetFields();
    await loadReviews();
  };

  const handleDelete = async (id: number): Promise<void> => {
    await deleteReview(id);
    message.success('已删除');
    await Promise.all([loadReviews(), loadEligibility()]);
  };

  const canWriteNew =
    !!user && eligibility?.canReview && !ownReview && editingId === null;
  const isEditingOwn = editingId !== null;

  return (
    <div style={{ marginTop: 32 }}>
      <Space align="baseline" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>商品评价</Typography.Title>
        {list && list.total > 0 ? (
          <Space>
            <Rate disabled allowHalf value={list.averageRating} />
            <Typography.Text type="secondary">
              {list.averageRating.toFixed(1)} · {list.total} 条
            </Typography.Text>
          </Space>
        ) : (
          <Typography.Text type="secondary">暂无评价</Typography.Text>
        )}
      </Space>

      {user && eligibility?.alreadyReviewed && !isEditingOwn && ownReview && (
        <Typography.Paragraph type="secondary">
          你已评价过该商品。
          <Button type="link" onClick={() => handleStartEdit(ownReview)}>编辑</Button>
          <Popconfirm title="确认删除你的评价？" onConfirm={() => handleDelete(ownReview.id)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </Typography.Paragraph>
      )}

      {user && eligibility && !eligibility.canReview && !eligibility.alreadyReviewed && (
        <Typography.Paragraph type="secondary">
          购买并收到货（订单已完成）后即可评价。
        </Typography.Paragraph>
      )}

      {!user && (
        <Typography.Paragraph type="secondary">登录后可查看是否能评价此商品。</Typography.Paragraph>
      )}

      {(canWriteNew || isEditingOwn) && (
        <Form<ReviewFormValues>
          form={form}
          layout="vertical"
          onFinish={isEditingOwn ? handleSaveEdit : handleCreate}
          style={{ marginBottom: 24 }}
        >
          <Form.Item name="rating" label="评分" rules={[{ required: true, message: '请选择评分' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="content" label="评价内容" rules={[{ max: 1000 }]}>
            <Input.TextArea rows={3} maxLength={1000} showCount placeholder="说点什么吧（可选）" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              {isEditingOwn ? '保存修改' : '发布评价'}
            </Button>
            {isEditingOwn && (
              <Button
                onClick={() => {
                  setEditingId(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
            )}
          </Space>
        </Form>
      )}

      {loading ? (
        <Spin />
      ) : !list || list.items.length === 0 ? (
        <Empty description="暂无评价" />
      ) : (
        <>
          <List
            dataSource={list.items}
            renderItem={(review) => (
              <List.Item key={review.id}>
                <List.Item.Meta
                  avatar={
                    <Avatar size="small" icon={<UserOutlined />} src={review.user?.avatar ?? undefined} />
                  }
                  title={
                    <Space>
                      <span>{review.user?.username ?? '匿名'}</span>
                      <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
                    </Space>
                  }
                  description={
                    <div>
                      <Typography.Paragraph style={{ marginBottom: 4 }}>
                        {review.content ?? '（无内容）'}
                      </Typography.Paragraph>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {review.createdAt?.slice(0, 10)}
                      </Typography.Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
          {list.total > PAGE_SIZE && (
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={list.total}
              onChange={setPage}
              showSizeChanger={false}
              style={{ marginTop: 16, textAlign: 'right' }}
            />
          )}
        </>
      )}
    </div>
  );
}
