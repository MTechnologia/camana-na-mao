import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminMobileMenuButton } from '@/components/admin/AdminSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from './NotificationDropdown';

const routeNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/docs': 'Documentação',
  '/admin/docs/overview': 'Documentação da plataforma',
  '/admin/notifications': 'Central de Alertas',
  '/admin/analytics': 'Análise de Relatos',
  '/admin/analytics/general': 'Análise de Relatos Gerais',
  '/admin/analytics/demograficos': 'Análise de Relatos Demográficos',
  '/admin/analytics/advanced': 'Análise Avançada',
  '/admin/users': 'Gestão de Usuários',
  '/admin/exports': 'Exportações',
  '/admin/urban-reports': 'Relatos Urbanos',
  '/admin/transport-reports': 'Relatos de Transporte',
  '/admin/reports': 'Gestão de Relatos',
  '/admin/referrals': 'Encaminhamentos',
  '/admin/commissions': 'Comissões (encaminhamento)',
  // HU-12 — auditoria
  '/admin/audit-logs': 'Logs de Auditoria',
  // HU-9 — analytics avançadas
  '/admin/trends': 'Tendência temporal',
  '/admin/reports-heatmap': 'Mapa de calor',
  '/admin/avaliacoes-polarizacao': 'Polarização de avaliações',
  '/admin/intensidade-demanda': 'Intensidade de demanda',
  '/admin/classification-accuracy': 'Acurácia da classificação',
  '/admin/padroes': 'Padrões da IA',
  '/admin/previsoes': 'Previsões',
  '/admin/anomalias': 'Anomalias',
  // HU-10 — triagem
  '/admin/triagem': 'Triagem',
  // HU-11 — permissões
  '/admin/permissions': 'Permissões',
  // HU-8 — agendamentos
  '/admin/configuracoes': 'Configurações',
  '/admin/configuracoes/agendamentos': 'Agendamentos',
  // Demais admin pages
  '/admin/audit-logs/': 'Logs de Auditoria',
  '/admin/service-corrections': 'Correções de equipamentos',
  '/admin/settings': 'Configurações',
  '/admin/settings/accessibility': 'Acessibilidade',
};

interface AdminHeaderProps {
  hideMobileMenu?: boolean;
  hideBreadcrumbs?: boolean;
}

export const AdminHeader = ({
  hideMobileMenu = false,
  hideBreadcrumbs = false,
}: AdminHeaderProps) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((_, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return {
      path,
      name: routeNames[path] || pathSegments[index],
    };
  });

  // Truncate breadcrumbs on mobile
  const displayBreadcrumbs = isMobile 
    ? [breadcrumbs[breadcrumbs.length - 1]] 
    : breadcrumbs;

  const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
  const hideHeaderDivider = pathNorm.startsWith('/admin/docs');

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-analytics-bar px-4 py-3 text-analytics-bar-foreground backdrop-blur-sm md:px-6 md:py-4',
        !hideHeaderDivider && 'border-b border-analytics-bar-border',
        hideHeaderDivider && 'border-b-0 shadow-none',
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isMobile && !hideMobileMenu && (
            <AdminMobileMenuButton className="shrink-0 text-analytics-bar-foreground hover:bg-analytics-bar-surface/20" />
          )}

          {!hideBreadcrumbs && (
          <div className="flex items-center gap-2 overflow-hidden text-sm text-analytics-bar-muted">
            {displayBreadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-2 truncate">
                {index > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                <span className={cn(
                  "truncate",
                  index === displayBreadcrumbs.length - 1
                    ? 'font-medium text-analytics-bar-foreground'
                    : ''
                )}>
                  {crumb.name}
                </span>
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <NotificationDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                {!isMobile && (
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-analytics-bar-foreground">{profile?.full_name}</p>
                    <p className="text-xs text-analytics-bar-muted">Administrador</p>
                  </div>
                )}
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.full_name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.phone}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/settings/accessibility')}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => signOut()}
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
