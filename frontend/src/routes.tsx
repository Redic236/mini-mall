import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import OrderConfirm from '@/pages/OrderConfirm';
import OrderList from '@/pages/OrderList';
import AddressManagement from '@/pages/AddressManagement';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'cart', element: <Cart /> },
      { path: 'order-confirm', element: <OrderConfirm /> },
      { path: 'orders', element: <OrderList /> },
      { path: 'addresses', element: <AddressManagement /> },
    ],
  },
]);
