import { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Popconfirm,
  Rate,
  Skeleton,
  Space,
  Typography,
  message,
} from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { deleteReview, fetchMyReviews, updateReview } from '@/services/review';
import type { MyReviewsResult, Review } from '@/types';

const PAGE_SIZE = 5;

interface EditValues {
  rating: number;
  content?: string;
}

export default function MyReviews(): JSX.Element {
  const [data, setData] = useState<MyReviewsResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form] = Form.useForm<EditValues>();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchMyReviews(page, PAGE_SIZE);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (review: Review): void => {
    setEditing(review);
    form.setFieldsValue({ rating: review.rating, content: review.content ?? '' });
  };

  const handleSave = async (values: EditValues): Promise<void> => {
    if (!editing) return;
    await updateReview(editing.id, { rating: values.rating, content: values.content });
    message.success('已更新');
    setEditing(null);
    form.resetFields();
    await load();
  };

  const handleDelete = async (id: number): Promise<void> => {
    await deleteReview(id);
    message.success('已删除');
    // If the last item on this page was removed, step back one page.
    if (data && data.items.length === 1 && page > 1) {
      setPage((p) => p - 1);
    } else {
      await load();
    }
  };

  const items = data?.items ?? [];

  return (
    <div>
      <h1 className="page-title">我的评价</h1>

      {loading && !data ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : items.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="你还没有评价过任何商品"
          >
            <Button type="primary" onClick={() => navigate('/')}>
              去逛逛
            </Button>
          </Empty>
        </div>
      ) : (
        <>
          <List
            dataSource={items}
            loading={loading}
            renderItem={(review) => (
              <List.Item
                key={review.id}
                actions={[
                  <Button key="edit" type="link" onClick={() => openEdit(review)}>
                    编辑
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确认删除这条评价？"
                    onConfirm={() => handleDelete(review.id)}
                  >
                    <Button type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    review.product?.image ? (
                      <Avatar shape="square" size={64} src={review.product.image} />
                    ) : (
                      <Avatar shape="square" size={64}>
                        {review.product?.name?.[0] ?? '?'}
                      </Avatar>
                    )
                  }
                  title={
                    <Space wrap>
                      {review.product ? (
                        <Link to={`/products/${review.product.id}`}>{review.product.name}</Link>
                      ) : (
                        <span>商品已下架</span>
                      )}
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
          {data && data.total > PAGE_SIZE && (
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onChange={setPage}
              showSizeChanger={false}
              style={{ marginTop: 16, textAlign: 'right' }}
            />
          )}
        </>
      )}

      <Modal
        title={editing?.product?.name ?? '编辑评价'}
        open={editing !== null}
        onCancel={() => {
          setEditing(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form<EditValues> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="rating" label="评分" rules={[{ required: true, message: '请选择评分' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="content" label="评价内容" rules={[{ max: 1000 }]}>
            <Input.TextArea rows={4} maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
