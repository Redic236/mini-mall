import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import RequireAuth from '@/components/RequireAuth';
import Home from '@/pages/Home';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import OrderConfirm from '@/pages/OrderConfirm';
import OrderList from '@/pages/OrderList';
import AddressManagement from '@/pages/AddressManagement';
import MyReviews from '@/pages/MyReviews';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'cart',
        element: (
          <RequireAuth>
            <Cart />
          </RequireAuth>
        ),
      },
      {
        path: 'order-confirm',
        element: (
          <RequireAuth>
            <OrderConfirm />
          </RequireAuth>
        ),
      },
      {
        path: 'orders',
        element: (
          <RequireAuth>
            <OrderList />
          </RequireAuth>
        ),
      },
      {
        path: 'addresses',
        element: (
          <RequireAuth>
            <AddressManagement />
          </RequireAuth>
        ),
      },
      {
        path: 'my-reviews',
        element: (
          <RequireAuth>
            <MyReviews />
          </RequireAuth>
        ),
      },
    ],
  },
]);
