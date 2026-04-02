import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { RecordsPage } from '../pages/RecordsPage';
import { UsersPage } from '../pages/UsersPage';
import { useAuthStore, type Permission } from '../store/auth.store';

function RequireAuth({ permission }: { permission?: Permission }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const can = useAuthStore((s) => s.can);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !can(permission)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

function PublicOnly() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          {
            element: <RequireAuth permission="dashboard.read" />,
            children: [{ path: '/dashboard', element: <DashboardPage /> }],
          },
          {
            element: <RequireAuth permission="records.read" />,
            children: [{ path: '/records', element: <RecordsPage /> }],
          },
          {
            element: <RequireAuth permission="users.manage" />,
            children: [{ path: '/users', element: <UsersPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
