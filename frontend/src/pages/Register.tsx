import { Button, Card, Form, Input, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { registerThunk } from '@/store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import type { RegisterInput } from '@/services/auth';

export default function Register(): JSX.Element {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((s) => s.auth);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/';

  const onFinish = async (values: RegisterInput): Promise<void> => {
    const action = await dispatch(registerThunk(values));
    if (registerThunk.fulfilled.match(action)) {
      navigate(redirect, { replace: true });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
      <Card style={{ width: 400 }} title="注册">
        <Form<RegisterInput> layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 50 },
              { pattern: /^[\w一-龥]+$/, message: '只能包含字母、数字、下划线或中文' },
            ]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 128, message: '密码 6–128 位' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            已有账号？<Link to="/login">去登录</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  );
}
