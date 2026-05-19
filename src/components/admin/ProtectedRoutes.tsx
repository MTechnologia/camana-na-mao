import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AdminProviders } from '@/components/admin/AdminProviders';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

function AdminAccessLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-muted-foreground">Verificando permissões...</p>
      </div>
    </div>
  );
}

/** gestor + admin */
export function ProtectedAdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isGestor, loading: roleLoading } = useUserRole();
  const loc = useLocation();

  if (authLoading || roleLoading) return <AdminAccessLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!isAdmin && !isGestor) return <Navigate to="/" replace />;

  return (
    <AdminProviders>
      <Outlet />
    </AdminProviders>
  );
}

export function ProtectedAdminOnlyRoute() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const loc = useLocation();

  if (authLoading || roleLoading) return <AdminAccessLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!isAdmin) return <Navigate to="/admin" replace />;

  return (
    <AdminProviders>
      <Outlet />
    </AdminProviders>
  );
}
