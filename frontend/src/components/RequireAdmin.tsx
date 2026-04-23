import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { useAppSelector } from '@/store/store';

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * Admin-only route guard. Layered on top of login: non-logged-in users go
 * to /login; logged-in-but-not-admin users get a visible 403 page instead
 * of silently redirecting so they understand why the link didn't work.
 *
 * We intentionally wait for `initialized === true` before deciding — on
 * first render the Redux store is seeded from localStorage, which can be
 * tampered by the client to claim role='admin'. Once hydrateSession has
 * round-tripped /auth/me the store holds the server's authoritative role
 * and a tampered user is replaced. The backend always enforces role on
 * every API call, but this keeps the UI from flashing an admin screen
 * during that window.
 */
export default function RequireAdmin({ children }: RequireAdminProps): JSX.Element {
  const { user, token, initialized } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!initialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '96px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user || !token) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (user.role !== 'admin') {
    return (
      <Result
        status="403"
        title="403"
        subTitle="需要管理员权限才能访问此页面"
        extra={
          <Button type="primary" href="/">
            返回首页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
