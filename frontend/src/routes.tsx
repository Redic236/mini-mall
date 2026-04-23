import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';
import RequireAuth from '@/components/RequireAuth';
import RequireAdmin from '@/components/RequireAdmin';

// Route-level code splitting: each page is emitted as its own chunk and
// fetched on demand. Layout's <Suspense> supplies the fallback.
const Home = lazy(() => import('@/pages/Home'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const OrderConfirm = lazy(() => import('@/pages/OrderConfirm'));
const OrderList = lazy(() => import('@/pages/OrderList'));
const AddressManagement = lazy(() => import('@/pages/AddressManagement'));
const MyReviews = lazy(() => import('@/pages/MyReviews'));
const Profile = lazy(() => import('@/pages/Profile'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));

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
      {
        path: 'profile',
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },
      {
        path: 'checkout',
        element: (
          <RequireAuth>
            <Checkout />
          </RequireAuth>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'orders', element: <AdminOrders /> },
          { path: 'products', element: <AdminProducts /> },
        ],
      },
    ],
  },
]);
