import { useEffect, useState } from 'react';
import {
  Button,
  Cascader,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tag,
} from 'antd';
import {
  addAddress,
  editAddress,
  loadAddresses,
  makeDefault,
  removeAddress,
} from '@/store/slices/addressSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import type { Address, AddressInput } from '@/types';

interface PcaNode {
  code: string;
  name: string;
  children?: PcaNode[];
}

interface RegionOption {
  value: string;
  label: string;
  children?: RegionOption[];
}

type AddressFormValues = Omit<AddressInput, 'province' | 'city' | 'district'> & {
  region: [string, string, string];
};

function toOptions(nodes: PcaNode[]): RegionOption[] {
  return nodes.map((n) => ({
    value: n.name,
    label: n.name,
    children: n.children ? toOptions(n.children) : undefined,
  }));
}

// Module-level cache — the 134KB dataset only needs to be parsed once per
// session, even if the user opens the address modal repeatedly.
let cachedOptions: RegionOption[] | null = null;

export default function AddressManagement(): JSX.Element {
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.addresses);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form] = Form.useForm<AddressFormValues>();
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>(
    cachedOptions ?? [],
  );
  const [loadingRegions, setLoadingRegions] = useState(cachedOptions === null);

  useEffect(() => {
    void dispatch(loadAddresses());
  }, [dispatch]);

  // Lazy-load the province/city/district dataset the first time the modal
  // opens — keeps it out of the initial JS chunk (it's a ~134KB JSON).
  useEffect(() => {
    if (!open || cachedOptions !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import('china-division/dist/pca-code.json');
        const data = (mod.default ?? mod) as unknown as PcaNode[];
        cachedOptions = toOptions(data);
        if (!cancelled) setRegionOptions(cachedOptions);
      } finally {
        if (!cancelled) setLoadingRegions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const openCreate = (): void => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (a: Address): void => {
    setEditing(a);
    form.setFieldsValue({
      name: a.name,
      phone: a.phone,
      region: [a.province, a.city, a.district],
      detail: a.detail,
      isDefault: a.isDefault,
    });
    setOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    const [province, city, district] = values.region;
    const payload: AddressInput = {
      name: values.name,
      phone: values.phone,
      province,
      city,
      district,
      detail: values.detail,
      isDefault: values.isDefault,
    };
    if (editing) {
      await dispatch(editAddress({ id: editing.id, input: payload }));
    } else {
      await dispatch(addAddress(payload));
    }
    setOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0 }}>收货地址</h1>
        <Button type="primary" onClick={openCreate}>新增地址</Button>
      </div>
      <List
        loading={loading}
        dataSource={list}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="还没有收货地址，添加一个吧"
              style={{ padding: '32px 0' }}
            >
              <Button type="primary" onClick={openCreate}>新增地址</Button>
            </Empty>
          ),
        }}
        renderItem={(a) => (
          <List.Item
            actions={[
              <Button key="edit" onClick={() => openEdit(a)}>编辑</Button>,
              !a.isDefault && (
                <Button key="default" onClick={() => void dispatch(makeDefault(a.id))}>
                  设为默认
                </Button>
              ),
              <Popconfirm key="del" title="确认删除？" onConfirm={() => void dispatch(removeAddress(a.id))}>
                <Button danger>删除</Button>
              </Popconfirm>,
            ].filter(Boolean) as React.ReactNode[]}
          >
            <List.Item.Meta
              title={
                <Space>
                  {a.name} {a.phone}
                  {a.isDefault && <Tag color="blue">默认</Tag>}
                </Space>
              }
              description={`${a.province}${a.city}${a.district} ${a.detail}`}
            />
          </List.Item>
        )}
      />

      <Modal
        title={editing ? '编辑地址' : '新增地址'}
        open={open}
        onOk={handleSubmit}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form<AddressFormValues> form={form} layout="vertical">
          <Form.Item name="name" label="收货人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="region"
            label="所在地区（省 / 市 / 区）"
            rules={[
              {
                validator: (_, value) =>
                  Array.isArray(value) && value.length === 3
                    ? Promise.resolve()
                    : Promise.reject(new Error('请选择完整的省 / 市 / 区')),
              },
            ]}
          >
            <Cascader
              options={regionOptions}
              placeholder="点击选择，或输入关键字筛选"
              loading={loadingRegions}
              allowClear
              changeOnSelect={false}
              showSearch={{
                filter: (input, path) =>
                  path.some((opt) => String(opt.label).includes(input.trim())),
              }}
            />
          </Form.Item>
          <Form.Item name="detail" label="详细地址" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="isDefault" label="设为默认" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
