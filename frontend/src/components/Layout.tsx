import { Suspense } from 'react';
import { Avatar, Button, Dropdown, Layout as AntLayout, Menu, Space, Spin } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '@/store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/store';

const { Header, Content, Footer } = AntLayout;

const NAV_ITEMS = [
  { key: '/', label: <Link to="/">首页</Link> },
  { key: '/cart', label: <Link to="/cart">购物车</Link> },
  { key: '/orders', label: <Link to="/orders">订单</Link> },
  { key: '/addresses', label: <Link to="/addresses">地址</Link> },
];

export default function Layout(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const selectedKey =
    NAV_ITEMS.find((item) => item.key !== '/' && location.pathname.startsWith(item.key))?.key ?? '/';

  const handleLogout = (): void => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: '个人资料', onClick: () => navigate('/profile') },
    { key: 'my-reviews', label: '我的评价', onClick: () => navigate('/my-reviews') },
    ...(user?.role === 'admin'
      ? [
          { type: 'divider' as const },
          { key: 'admin', label: '管理后台', onClick: () => navigate('/admin') },
        ]
      : []),
    { type: 'divider', key: 'divider-logout' },
    { key: 'logout', label: '退出登录', onClick: handleLogout },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ color: '#1677ff', fontWeight: 700, whiteSpace: 'nowrap' }}>Mini 商城</div>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS}
          style={{ flex: 1, borderBottom: 'none', minWidth: 0 }}
        />
        {user ? (
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} src={user.avatar ?? undefined} />
              <span className="hide-on-mobile">{user.username}</span>
            </Space>
          </Dropdown>
        ) : (
          <Space size={8}>
            <Button type="text" onClick={() => navigate('/login')}>
              登录
            </Button>
            <Button type="primary" onClick={() => navigate('/register')}>
              注册
            </Button>
          </Space>
        )}
      </Header>
      <Content>
        <div className="app-container">
          <Suspense
            fallback={
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <Spin />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>Mini Mall © {new Date().getFullYear()}</Footer>
    </AntLayout>
  );
}
