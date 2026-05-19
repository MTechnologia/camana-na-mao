import { Outlet } from 'react-router-dom';
import { AdminAppLayout } from '@/components/admin/AdminAppLayout';
import { AdminProviders } from '@/components/admin/AdminProviders';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';
import { useUserRole } from '@/hooks/useUserRole';

/** Gestor/admin: shell PO; cidadão: apenas o conteúdo da rota. */
export function PaineisLayout() {
  const { isAdmin, isGestor, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageSkeleton />
      </div>
    );
  }

  if (isAdmin || isGestor) {
    return (
      <AdminProviders>
        <AdminAppLayout />
      </AdminProviders>
    );
  }

  return <Outlet />;
}
