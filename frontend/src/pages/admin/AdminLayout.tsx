import { Suspense } from 'react';
import { Layout, Menu, Spin } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Sider, Content } = Layout;

const NAV = [
  { key: '/admin', label: <Link to="/admin">总览</Link> },
  { key: '/admin/orders', label: <Link to="/admin/orders">订单管理</Link> },
  { key: '/admin/products', label: <Link to="/admin/products">商品管理</Link> },
];

export default function AdminLayout(): JSX.Element {
  const location = useLocation();
  const selected =
    NAV.find((n) => n.key !== '/admin' && location.pathname.startsWith(n.key))?.key ?? '/admin';

  return (
    <Layout style={{ minHeight: 'calc(100vh - 64px - 70px)' }}>
      <Sider
        breakpoint="md"
        collapsedWidth={0}
        theme="light"
        width={200}
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div style={{ padding: '16px 24px', fontWeight: 600, color: '#1677ff' }}>管理后台</div>
        <Menu mode="inline" selectedKeys={[selected]} items={NAV} />
      </Sider>
      <Content style={{ padding: 24 }}>
        <Suspense
          fallback={
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </Content>
    </Layout>
  );
}
