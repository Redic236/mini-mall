import { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store, useAppDispatch } from '@/store/store';
import { router } from '@/routes';
import { hydrateSession, logout } from '@/store/slices/authSlice';
import { onUnauthorized } from '@/services/tokenStore';

function AuthBootstrap(): null {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(hydrateSession());
  }, [dispatch]);

  useEffect(() => {
    return onUnauthorized(() => {
      dispatch(logout());
      // If the user was on a protected page, RequireAuth will redirect on
      // next render because token/user are now cleared.
    });
  }, [dispatch]);

  return null;
}

export default function App(): JSX.Element {
  return (
    <Provider store={store}>
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
        <AuthBootstrap />
        <RouterProvider router={router} />
      </ConfigProvider>
    </Provider>
  );
}
