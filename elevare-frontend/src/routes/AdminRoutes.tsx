/* loaded only for admin URLs, so the public site never downloads it */
import {StrictMode, type ReactNode} from 'react';
import {AuthProvider} from '@/context/auth/AuthProvider';
import {RouterProvider} from '@/context/router/RouterProvider';
import {ToastProvider} from '@/context/toast/ToastProvider';
import {useBodyClass, useNoIndex} from '@/hooks/useDocument';
import {useRouter} from '@/hooks/useRouter';
import AdminLoginPage from '@/pages/admin-login/AdminLoginPage';
import AdminDashboardPage from '@/pages/admin-dashboard/AdminDashboardPage';
import {GuestOnly, RequireAuth} from './guards';
import {Navigate} from './Navigate';
import {PATHS} from './paths';

const ROUTES: Record<string, () => ReactNode> = {
  [PATHS.login]: () => (
    <GuestOnly>
      <AdminLoginPage />
    </GuestOnly>
  ),
  [PATHS.dashboard]: () => (
    <RequireAuth>
      <AdminDashboardPage />
    </RequireAuth>
  )
};

function AdminRouteSwitch() {
  const {location} = useRouter();
  useBodyClass('is-admin');
  useNoIndex();
  const route = ROUTES[location.pathname];
  return route ? route() : <Navigate to={PATHS.dashboard} />;
}

export default function AdminRoutes() {
  return (
    <StrictMode>
      <RouterProvider>
        <ToastProvider>
          <AuthProvider>
            <AdminRouteSwitch />
          </AuthProvider>
        </ToastProvider>
      </RouterProvider>
    </StrictMode>
  );
}
