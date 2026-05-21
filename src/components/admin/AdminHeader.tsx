import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AdminDesktopSidebarToggle,
  AdminMobileMenuButton,
} from '@/components/admin/AdminSidebar';
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
import { AdminAnalyticsFilters } from './AdminAnalyticsFilters';
import {
  adminBarActionsGroupClass,
  adminBarAnalyticsNavButtonClass,
  adminBarGhostActionClass,
  adminBarNavButtonClass,
} from './adminHeaderStyles';

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
  '/admin/audit-logs': 'Logs de Auditoria',
  '/admin/trends': 'Tendência temporal',
  '/admin/reports-heatmap': 'Mapa de calor',
  '/admin/avaliacoes-polarizacao': 'Polarização de avaliações',
  '/admin/intensidade-demanda': 'Intensidade de demanda',
  '/admin/classification-accuracy': 'Acurácia da classificação',
  '/admin/padroes': 'Padrões da IA',
  '/admin/previsoes': 'Previsões',
  '/admin/anomalias': 'Anomalias',
  '/admin/triagem': 'Triagem',
  '/admin/permissions': 'Permissões',
  '/admin/configuracoes': 'Configurações',
  '/admin/configuracoes/agendamentos': 'Agendamentos',
  '/admin/audit-logs/': 'Logs de Auditoria',
  '/admin/service-corrections': 'Correções de equipamentos',
  '/admin/settings': 'Configurações',
  '/admin/settings/accessibility': 'Acessibilidade',
};

interface AdminHeaderProps {
  /** Exibe filtros de recorte analítico (período, região, categoria). */
  showAnalyticsFilters?: boolean;
  hideMobileMenu?: boolean;
  hideBreadcrumbs?: boolean;
}

function AdminHeaderActions() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { signOut } = useAuth();

  return (
    <div className={adminBarActionsGroupClass}>
      <NotificationDropdown triggerClassName={adminBarGhostActionClass} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-9 w-9', adminBarGhostActionClass)}
            aria-label="Menu da conta"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-analytics-bar-surface text-analytics-bar-control">
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
          <DropdownMenuItem onClick={() => navigate('/perfil')}>Perfil</DropdownMenuItem>
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
  );
}

function AdminHeaderNavControls({
  hideMobileMenu,
  analyticsMode = false,
}: {
  hideMobileMenu: boolean;
  analyticsMode?: boolean;
}) {
  const navClass = analyticsMode ? adminBarAnalyticsNavButtonClass : adminBarNavButtonClass;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {!hideMobileMenu && <AdminMobileMenuButton className={navClass} />}
      <AdminDesktopSidebarToggle className={navClass} />
    </div>
  );
}

function AdminHeaderDivider() {
  return (
    <div
      className="hidden h-8 w-px shrink-0 bg-analytics-bar-border/60 sm:block"
      aria-hidden
    />
  );
}

function AdminHeaderBreadcrumbs() {
  const isMobile = useIsMobile();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((_, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return {
      path,
      name: routeNames[path] || pathSegments[index],
    };
  });

  if (breadcrumbs.length === 0) return null;

  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const trail = isMobile ? [currentPage] : breadcrumbs;

  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center">
      {isMobile && (
        <p className="truncate text-base font-semibold leading-tight text-analytics-bar-foreground sm:hidden">
          {currentPage.name}
        </p>
      )}

      <nav aria-label="Localização no painel" className="min-w-0">
        <ol
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-1 text-sm text-analytics-bar-muted',
            isMobile && 'hidden sm:flex',
          )}
        >
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;

            return (
              <li key={crumb.path} className="flex min-w-0 max-w-full items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                )}
                {isLast ? (
                  <span
                    className="truncate font-medium text-analytics-bar-foreground"
                    aria-current="page"
                  >
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="truncate hover:text-analytics-bar-foreground hover:underline"
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

export const AdminHeader = ({
  showAnalyticsFilters = false,
  hideMobileMenu = false,
  hideBreadcrumbs = false,
}: AdminHeaderProps) => {
  const location = useLocation();
  const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
  const hideHeaderDivider = pathNorm.startsWith('/admin/docs');

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-analytics-bar backdrop-blur-sm',
        showAnalyticsFilters ? 'text-white' : 'text-analytics-bar-foreground',
        !hideHeaderDivider && 'border-b shadow-sm',
        showAnalyticsFilters ? 'border-white/10 shadow-black/10' : 'border-analytics-bar-border',
        hideHeaderDivider && 'border-b-0 shadow-none',
      )}
    >
      <div className={cn('px-3 sm:px-4 md:px-5', showAnalyticsFilters && 'lg:px-6')}>
        {showAnalyticsFilters ? (
          <div className="flex min-w-0 items-center gap-2 py-2 sm:gap-2.5 md:py-2">
            <AdminHeaderNavControls hideMobileMenu={false} analyticsMode />
            <AdminAnalyticsFilters />
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2.5 sm:gap-3 md:py-3">
            <AdminHeaderNavControls hideMobileMenu={hideMobileMenu} />
            {!hideBreadcrumbs && (
              <>
                <AdminHeaderDivider />
                <AdminHeaderBreadcrumbs />
              </>
            )}
            {!hideBreadcrumbs ? null : <div className="min-w-0 flex-1" aria-hidden />}
            <AdminHeaderActions />
          </div>
        )}
      </div>
    </header>
  );
};
