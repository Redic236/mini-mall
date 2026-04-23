import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminProducts,
  updateAdminProduct,
  type AdminProductInput,
} from '@/services/admin';
import type { Product } from '@/types';
import { formatCNY } from '@/utils/format';
import { LOW_STOCK_ADMIN } from '@/utils/stockThresholds';

interface DrawerState {
  open: boolean;
  editing: Product | null;
}

const EMPTY_FORM: AdminProductInput = {
  name: '',
  price: 0,
  description: '',
  category: '',
  image: '',
  stock: 0,
};

export default function AdminProducts(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, editing: null });
  const [form] = Form.useForm<AdminProductInput>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await fetchAdminProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (): void => {
    form.setFieldsValue(EMPTY_FORM);
    setDrawer({ open: true, editing: null });
  };

  const openEdit = (p: Product): void => {
    form.setFieldsValue({
      name: p.name,
      price: Number(p.price),
      description: p.description ?? '',
      category: p.category,
      image: p.image ?? '',
      stock: Number(p.stock),
    });
    setDrawer({ open: true, editing: p });
  };

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    // Normalise empty strings back to null so the backend doesn't store "".
    const payload: AdminProductInput = {
      ...values,
      description: values.description?.trim() ? values.description : null,
      image: values.image?.trim() ? values.image : null,
    };
    if (drawer.editing) {
      await updateAdminProduct(drawer.editing.id, payload);
      void message.success('商品已更新');
    } else {
      await createAdminProduct(payload);
      void message.success('商品已创建');
    }
    setDrawer({ open: false, editing: null });
    await load();
  };

  const handleDelete = async (id: number): Promise<void> => {
    await deleteAdminProduct(id);
    void message.success('已删除');
    await load();
  };

  const columns: ColumnsType<Product> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '名称', dataIndex: 'name' },
    { title: '分类', dataIndex: 'category', width: 100 },
    { title: '价格', dataIndex: 'price', width: 100, render: (v) => formatCNY(Number(v)) },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 100,
      render: (v: number) => (
        <span style={{ color: v < LOW_STOCK_ADMIN ? '#ff4d4f' : undefined }}>{v}</span>
      ),
    },
    {
      title: '图片',
      dataIndex: 'image',
      width: 80,
      render: (url: string | null) =>
        url ? (
          <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          '—'
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>
            编辑
          </Button>
          <Popconfirm title="删除此商品？" onConfirm={() => void handleDelete(r.id)}>
            <Button danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          商品管理
        </Typography.Title>
        <Button type="primary" onClick={openCreate}>
          新增商品
        </Button>
      </div>

      <Table<Product>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={products}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 900 }}
      />

      <Drawer
        title={drawer.editing ? '编辑商品' : '新增商品'}
        open={drawer.open}
        width={480}
        onClose={() => setDrawer({ open: false, editing: null })}
        extra={
          <Space>
            <Button onClick={() => setDrawer({ open: false, editing: null })}>取消</Button>
            <Button type="primary" onClick={() => void handleSubmit()}>
              保存
            </Button>
          </Space>
        }
        destroyOnClose
      >
        <Form<AdminProductInput> form={form} layout="vertical" initialValues={EMPTY_FORM}>
          <Form.Item name="name" label="名称" rules={[{ required: true, max: 255 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="price" label="价格（元）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, max: 50 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="stock" label="库存" rules={[{ required: true }]}>
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="image" label="图片 URL" rules={[{ max: 512 }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ max: 2000 }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
