import { useUserRole } from '@/hooks/useUserRole';
import AnalyticsDashboard from '@/pages/analytics/AnalyticsDashboard';
import AdvancedAnalytics from '@/pages/analytics/AdvancedAnalytics';
import CreateDashboard from '@/pages/analytics/CreateDashboard';
import { PaineisAvancado } from '@/pages/paineis/PaineisAvancado';
import { PaineisCriar } from '@/pages/paineis/PaineisCriar';
import { PaineisDashboard } from '@/pages/paineis/PaineisDashboard';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

export function PaineisIndexRoute() {
  const { canUseStaffPaineis, loading } = useUserRole();
  if (loading) return <PageSkeleton />;
  if (canUseStaffPaineis) return <PaineisDashboard />;
  return <AnalyticsDashboard />;
}

export function PaineisAvancadoRoute() {
  const { canUseStaffPaineis, loading } = useUserRole();
  if (loading) return <PageSkeleton />;
  if (canUseStaffPaineis) return <PaineisAvancado />;
  return <AdvancedAnalytics />;
}

export function PaineisCriarRoute() {
  const { canUseStaffPaineis, loading } = useUserRole();
  if (loading) return <PageSkeleton />;
  if (canUseStaffPaineis) return <PaineisCriar />;
  return <CreateDashboard />;
}
