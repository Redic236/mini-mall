import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import {
  createAdminCoupon,
  deleteAdminCoupon,
  fetchAdminCoupons,
  updateAdminCoupon,
  type CouponInput,
} from '@/services/coupon';
import type { Coupon } from '@/types';
import { formatCNY } from '@/utils/format';

interface FormValues {
  code: string;
  name: string;
  type: 'fixed' | 'percentage';
  value: number;
  minOrderAmount: number;
  window: [Dayjs, Dayjs];
  totalQuantity: number | null;
  perUserLimit: number;
  isActive: boolean;
}

const EMPTY: FormValues = {
  code: '',
  name: '',
  type: 'fixed',
  value: 0,
  minOrderAmount: 0,
  window: [dayjs(), dayjs().add(30, 'day')],
  totalQuantity: null,
  perUserLimit: 1,
  isActive: true,
};

export default function AdminCoupons(): JSX.Element {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Coupon | null }>({
    open: false,
    editing: null,
  });
  const [form] = Form.useForm<FormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons(await fetchAdminCoupons());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (): void => {
    form.setFieldsValue(EMPTY);
    setDrawer({ open: true, editing: null });
  };

  const openEdit = (c: Coupon): void => {
    form.setFieldsValue({
      code: c.code,
      name: c.name,
      type: c.type,
      value: Number(c.value),
      minOrderAmount: Number(c.minOrderAmount),
      window: [dayjs(c.startsAt), dayjs(c.expiresAt)],
      totalQuantity: c.totalQuantity ?? null,
      perUserLimit: c.perUserLimit,
      isActive: c.isActive,
    });
    setDrawer({ open: true, editing: c });
  };

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    const payload: CouponInput = {
      code: values.code,
      name: values.name,
      type: values.type,
      value: values.value,
      minOrderAmount: values.minOrderAmount,
      startsAt: values.window[0].toISOString(),
      expiresAt: values.window[1].toISOString(),
      totalQuantity: values.totalQuantity,
      perUserLimit: values.perUserLimit,
      isActive: values.isActive,
    };
    if (drawer.editing) {
      await updateAdminCoupon(drawer.editing.id, payload);
      void message.success('优惠券已更新');
    } else {
      await createAdminCoupon(payload);
      void message.success('优惠券已创建');
    }
    setDrawer({ open: false, editing: null });
    await load();
  };

  const handleDelete = async (id: number): Promise<void> => {
    await deleteAdminCoupon(id);
    void message.success('已删除');
    await load();
  };

  const columns: ColumnsType<Coupon> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: 'Code',
      dataIndex: 'code',
      width: 140,
      render: (v) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{v}</Tag>,
    },
    { title: '名称', dataIndex: 'name' },
    {
      title: '规则',
      key: 'rule',
      render: (_, r) =>
        r.type === 'fixed'
          ? `满 ${formatCNY(r.minOrderAmount)} 减 ¥${Number(r.value).toFixed(0)}`
          : `${Number(r.value).toFixed(0)}% 折扣`,
    },
    {
      title: '有效期',
      key: 'window',
      render: (_, r) => `${r.startsAt.slice(0, 10)} ~ ${r.expiresAt.slice(0, 10)}`,
    },
    {
      title: '配额',
      key: 'quota',
      render: (_, r) => `${r.usedCount} / ${r.totalQuantity ?? '∞'}`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      width: 80,
      render: (a: boolean) => (a ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
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
          <Popconfirm title="删除此券？" onConfirm={() => void handleDelete(r.id)}>
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
          优惠券管理
        </Typography.Title>
        <Button type="primary" onClick={openCreate}>
          新增优惠券
        </Button>
      </div>

      <Table<Coupon>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={coupons}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />

      <Drawer
        title={drawer.editing ? '编辑优惠券' : '新增优惠券'}
        open={drawer.open}
        width={520}
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
        <Form<FormValues> form={form} layout="vertical" initialValues={EMPTY}>
          <Form.Item
            name="code"
            label="券码"
            rules={[
              { required: true, max: 40 },
              { pattern: /^[A-Z0-9_-]+$/, message: '仅大写字母 / 数字 / 下划线 / 连字符' },
            ]}
          >
            <Input placeholder="例如 WELCOME10" />
          </Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true, max: 100 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="fixed">固定金额（fixed）</Radio>
              <Radio value="percentage">百分比折扣（percentage）</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="value" label="值（元 / %）" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="minOrderAmount" label="最低订单金额（元）">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="window" label="有效期" rules={[{ required: true }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="totalQuantity" label="总量（空 = 不限）">
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="不限" />
          </Form.Item>
          <Form.Item name="perUserLimit" label="每用户上限" rules={[{ required: true }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isActive" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}
