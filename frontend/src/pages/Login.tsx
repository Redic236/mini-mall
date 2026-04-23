import { Button, Card, Form, Input, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginThunk } from '@/store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';
import type { LoginInput } from '@/services/auth';

export default function Login(): JSX.Element {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((s) => s.auth.loading);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/';

  const onFinish = async (values: LoginInput): Promise<void> => {
    const action = await dispatch(loginThunk(values));
    if (loginThunk.fulfilled.match(action)) {
      navigate(redirect, { replace: true });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
      <Card style={{ width: 400 }} title="登录">
        <Form<LoginInput> layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
          <Typography.Text type="secondary">
            还没有账号？<Link to="/register">立即注册</Link>
          </Typography.Text>
        </Form>
      </Card>
    </div>
  );
}
