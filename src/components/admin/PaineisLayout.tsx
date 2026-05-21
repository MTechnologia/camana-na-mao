import { Outlet } from 'react-router-dom';
import { AdminAppLayout } from '@/components/admin/AdminAppLayout';
import { AdminProviders } from '@/components/admin/AdminProviders';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';
import { useUserRole } from '@/hooks/useUserRole';

/** Staff institucional: shell admin PO; demais: conteúdo da rota sem sidebar. */
export function PaineisLayout() {
  const { canUseStaffPaineis, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageSkeleton />
      </div>
    );
  }

  if (canUseStaffPaineis) {
    return (
      <AdminProviders>
        <AdminAppLayout />
      </AdminProviders>
    );
  }

  return <Outlet />;
}
