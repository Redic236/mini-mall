import { useState } from 'react';
import { Avatar, Button, Card, Descriptions, Space, Typography, Upload, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { RcFile, UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import { uploadAvatarThunk } from '@/store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function Profile(): JSX.Element {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [uploading, setUploading] = useState(false);

  if (!user) return <></>;

  const beforeUpload = (file: RcFile): boolean => {
    // Frontend checks mirror the backend rules — the server still enforces
    // them, but catching it here saves a round-trip and a misleading toast.
    if (!ACCEPTED_MIME.has(file.type)) {
      void message.error('仅支持 JPG / PNG / WEBP 图片');
      return Upload.LIST_IGNORE as unknown as boolean;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      void message.error('图片大小不能超过 2 MB');
      return Upload.LIST_IGNORE as unknown as boolean;
    }
    return true;
  };

  const handleChange = async (info: UploadChangeParam<UploadFile>): Promise<void> => {
    const file = info.file.originFileObj as File | undefined;
    if (!file) return;
    setUploading(true);
    try {
      const result = await dispatch(uploadAvatarThunk(file));
      if (uploadAvatarThunk.fulfilled.match(result)) {
        message.success('头像已更新');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">个人资料</h1>
      <Card>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Space size={24} align="center">
            <Avatar size={96} icon={<UserOutlined />} src={user.avatar ?? undefined} />
            <Upload
              accept="image/jpeg,image/png,image/webp"
              showUploadList={false}
              customRequest={({ onSuccess }) => onSuccess?.('ok')}
              beforeUpload={beforeUpload}
              onChange={handleChange}
            >
              <Button loading={uploading}>{user.avatar ? '更换头像' : '上传头像'}</Button>
            </Upload>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            支持 JPG / PNG / WEBP，不超过 2 MB。
          </Typography.Text>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>
    </div>
  );
}
