import { Layout as AntLayout, Menu } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Header, Content, Footer } = AntLayout;

const NAV_ITEMS = [
  { key: '/', label: <Link to="/">首页</Link> },
  { key: '/cart', label: <Link to="/cart">购物车</Link> },
  { key: '/orders', label: <Link to="/orders">订单</Link> },
  { key: '/addresses', label: <Link to="/addresses">地址</Link> },
];

export default function Layout(): JSX.Element {
  const location = useLocation();
  const selectedKey = NAV_ITEMS.find((item) => location.pathname.startsWith(item.key) && item.key !== '/')
    ? NAV_ITEMS.find((item) => location.pathname.startsWith(item.key) && item.key !== '/')!.key
    : '/';

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#fff' }}>
        <div style={{ color: '#1677ff', fontWeight: 700, marginRight: 32 }}>Mini 商城</div>
        <Menu
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS}
          style={{ flex: 1, borderBottom: 'none' }}
        />
      </Header>
      <Content>
        <div className="app-container">
          <Outlet />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>Mini Mall © {new Date().getFullYear()}</Footer>
    </AntLayout>
  );
}
