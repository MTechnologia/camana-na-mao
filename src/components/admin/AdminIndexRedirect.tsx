import { Navigate } from 'react-router-dom';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { useUserRole } from '@/hooks/useUserRole';
import { rolesGrantPermission } from '@/lib/permissions';

/** Rota inicial do /admin conforme o papel (gabinete → encaminhamentos). */
export function AdminIndexRedirect() {
  const { roles, isAdmin, isGestor, loading } = useUserRole();

  if (loading) return null;

  if (isAdmin || isGestor || rolesGrantPermission(roles, 'analytics.view_advanced')) {
    return <AdminDashboard />;
  }

  if (rolesGrantPermission(roles, 'reports.read') || rolesGrantPermission(roles, 'gabinete.view')) {
    return <Navigate to="/admin/referrals" replace />;
  }

  return <Navigate to="/" replace />;
}
