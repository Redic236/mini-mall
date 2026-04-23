import { useEffect, useState } from 'react';
import { Button, Empty, Form, Input, List, Modal, Popconfirm, Space, Switch, Tag } from 'antd';
import {
  addAddress,
  editAddress,
  loadAddresses,
  makeDefault,
  removeAddress,
} from '@/store/slices/addressSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import type { Address, AddressInput } from '@/types';

export default function AddressManagement(): JSX.Element {
  const dispatch = useAppDispatch();
  const { list, loading } = useAppSelector((s) => s.addresses);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form] = Form.useForm<AddressInput>();

  useEffect(() => {
    void dispatch(loadAddresses());
  }, [dispatch]);

  const openCreate = (): void => {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  };

  const openEdit = (a: Address): void => {
    setEditing(a);
    form.setFieldsValue(a);
    setOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    if (editing) {
      await dispatch(editAddress({ id: editing.id, input: values }));
    } else {
      await dispatch(addAddress(values));
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
        <Form<AddressInput> form={form} layout="vertical">
          <Form.Item name="name" label="收货人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="province" label="省" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="city" label="市" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="district" label="区" rules={[{ required: true }]}>
            <Input />
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
