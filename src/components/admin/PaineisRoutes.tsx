import { useUserRole } from '@/hooks/useUserRole';
import AnalyticsDashboard from '@/pages/analytics/AnalyticsDashboard';
import AdvancedAnalytics from '@/pages/analytics/AdvancedAnalytics';
import CreateDashboard from '@/pages/analytics/CreateDashboard';
import { PaineisAvancado } from '@/pages/paineis/PaineisAvancado';
import { PaineisCriar } from '@/pages/paineis/PaineisCriar';
import { PaineisDashboard } from '@/pages/paineis/PaineisDashboard';

export function PaineisIndexRoute() {
  const { isAdmin, isGestor } = useUserRole();
  if (isAdmin || isGestor) return <PaineisDashboard />;
  return <AnalyticsDashboard />;
}

export function PaineisAvancadoRoute() {
  const { isAdmin, isGestor } = useUserRole();
  if (isAdmin || isGestor) return <PaineisAvancado />;
  return <AdvancedAnalytics />;
}

export function PaineisCriarRoute() {
  const { isAdmin, isGestor } = useUserRole();
  if (isAdmin || isGestor) return <PaineisCriar />;
  return <CreateDashboard />;
}
