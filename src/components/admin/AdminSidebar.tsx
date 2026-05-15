import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, Users, Download, ChevronLeft, Home, Building2, MessageSquare, Settings, ChevronDown, FileText, Send, BarChart3, PieChart, Bell, ClipboardList, Target, LineChart, Flame, BookOpen, Landmark, Star, Activity, CalendarClock, Sparkles, TrendingUp, Siren, ClipboardCheck, Shield, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdminStats } from '@/hooks/useAdminStats';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useUserRole } from '@/hooks/useUserRole';

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  badge?: number | null;
  submenu?: Array<{ title: string; href: string; badge?: number }>;
}

interface MenuSection {
  section: string | null;
  items: MenuItem[];
}

interface AdminSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
}

export const AdminSidebar = ({ mobileOpen, setMobileOpen, isMobile }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['gestão', 'relatos', 'configuracoes']);
  const stats = useAdminStats();
  const { unreadCount } = useNotifications();
  const { canManageUsers, canConfigureSystem, canViewAuditLogs, canModerateServiceCorrections } = useUserRole();

  const menuSections: MenuSection[] = [
    {
      section: null,
      items: [
        { title: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
      ],
    },
    {
      section: 'GESTÃO',
      items: [
        { title: 'Relatos', icon: MessageSquare, href: '/admin/reports', badge: stats.pendingReports },
        // HU-10.3 — Triagem kanban (admin + gestor).
        { title: 'Triagem', icon: ClipboardCheck, href: '/admin/triagem' },
        { title: 'Análise de Relatos Gerais', icon: BarChart3, href: '/admin/analytics/general' },
        { title: 'Análise de Relatos Demográficos', icon: UserRound, href: '/admin/analytics/demograficos' },
        { title: 'Tendência temporal', icon: LineChart, href: '/admin/trends' },
        { title: 'Mapa de calor', icon: Flame, href: '/admin/reports-heatmap' },
        { title: 'Polarização de avaliações', icon: Star, href: '/admin/avaliacoes-polarizacao' },
        { title: 'Intensidade de demanda', icon: Activity, href: '/admin/intensidade-demanda' },
        { title: 'Acurácia da classificação', icon: Target, href: '/admin/classification-accuracy' },
        { title: 'Encaminhamentos', icon: Send, href: '/admin/referrals', badge: stats.pendingReferrals },
        { title: 'Comissões', icon: Landmark, href: '/admin/commissions' },
        ...(canModerateServiceCorrections
          ? [
              {
                title: 'Correções de equipamentos',
                icon: ClipboardList,
                href: '/admin/service-corrections',
                badge: stats.pendingServiceCorrections > 0 ? stats.pendingServiceCorrections : null,
              },
            ]
          : []),
        ...(canManageUsers ? [{ title: 'Gestão de Usuários', icon: Users, href: '/admin/users' }] : []),
      ],
    },
    {
      section: 'SISTEMA',
      items: [
        { title: 'Documentação', icon: BookOpen, href: '/admin/docs/overview' },
        ...(canConfigureSystem ? [{
          title: 'Configurações',
          icon: Settings,
          submenu: [
            { title: 'Automação de Workflows', href: '/admin/settings/n8n' },
            { title: 'Acessibilidade', href: '/admin/settings/accessibility' },
          ],
        }] : []),
        ...(canViewAuditLogs ? [{ title: 'Logs de Auditoria', icon: FileText, href: '/admin/audit-logs' }] : []),
        // HU-11.2 — Matriz de permissões (admin).
        ...(canConfigureSystem ? [{ title: 'Permissões', icon: Shield, href: '/admin/permissions' }] : []),
        { title: 'Logs de Exportação', icon: Download, href: '/admin/exports' },
        // HU-8.1 — Acesso direto à gestão de agendamentos de export (admin + gestor).
        { title: 'Agendamentos', icon: CalendarClock, href: '/admin/configuracoes/agendamentos' },
        // HU-9.1 — Padrões detectados pela IA (admin + gestor).
        { title: 'Padrões da IA', icon: Sparkles, href: '/admin/padroes' },
        // HU-9.2 — Previsões de volume de relatos.
        { title: 'Previsões', icon: TrendingUp, href: '/admin/previsoes' },
        // HU-9.3 — Detecção de anomalias.
        { title: 'Anomalias', icon: Siren, href: '/admin/anomalias' },
        { title: 'Central de Alertas', icon: Bell, href: '/admin/notifications', badge: unreadCount > 0 ? unreadCount : null },
      ],
    },
  ];
  const handleNavigate = (href: string) => {
    navigate(href);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) =>
    location.pathname === href ||
    (href === '/admin/analytics/general' && location.pathname === '/admin/analytics');

  const SidebarContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn(
        "p-4 border-b border-border/50 flex items-center justify-between shrink-0",
        "bg-gradient-to-r from-primary/5 to-primary/10"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Câmara na Mão
              </h2>
              <p className="text-xs text-muted-foreground">Área Admin</p>
            </div>
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto hover:bg-primary/10"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto overscroll-contain p-4">
        {menuSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.section && (
              <div className="px-3 py-2">
                {!collapsed && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.section}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <div key={item.title}>
                  {item.submenu ? (
                    <Collapsible
                      open={openSubmenus.includes(item.title.toLowerCase().split(' ')[0])}
                      onOpenChange={() => toggleSubmenu(item.title.toLowerCase().split(' ')[0])}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                            'hover:bg-muted text-muted-foreground hover:text-foreground',
                            'group'
                          )}
                        >
                          <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-muted transition-colors">
                            <item.icon className="h-4 w-4 flex-shrink-0 transition-colors" />
                          </div>
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left text-sm">{item.title}</span>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform",
                                openSubmenus.includes(item.title.toLowerCase().split(' ')[0]) && "rotate-180"
                              )} />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      {!collapsed && (
                        <CollapsibleContent className="space-y-1 mt-1">
                          {item.submenu.map((subitem) => (
                            <button
                              key={subitem.href}
                              onClick={() => handleNavigate(subitem.href)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 ml-6 rounded-lg transition-all text-sm',
                                'hover:bg-muted text-muted-foreground hover:text-foreground',
                                isActive(subitem.href) && 'bg-muted text-foreground font-medium'
                              )}
                            >
                              <span className="flex-1 text-left">{subitem.title}</span>
                              {subitem.badge !== undefined && subitem.badge > 0 && (
                                <Badge variant="secondary" className="ml-auto">
                                  {subitem.badge}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  ) : (
                    <button
                      onClick={() => item.href && handleNavigate(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                        'hover:bg-muted text-muted-foreground hover:text-foreground',
                        'group',
                        item.href && isActive(item.href) && 'bg-muted text-foreground font-medium'
                      )}
                    >
                      <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-muted transition-colors">
                        <item.icon className="h-4 w-4 flex-shrink-0 transition-colors" />
                      </div>
                      {!collapsed && (
                        <span className="flex-1 text-left text-sm">{item.title}</span>
                      )}
                      {!collapsed && item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {sectionIdx < menuSections.length - 1 && <Separator className="my-2" />}
          </div>
        ))}
      </nav>

      <Separator className="my-2 shrink-0" />

      <div className="shrink-0 p-4 space-y-2">
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start hover:bg-primary/5 transition-colors",
            collapsed && "justify-center"
          )}
          onClick={() => {
            navigate('/');
            if (isMobile) setMobileOpen(false);
          }}
        >
          <Home className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Voltar ao App</span>}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu administrativo</SheetTitle>
            <SheetDescription>Navegação do painel de administração</SheetDescription>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'bg-card/50 backdrop-blur-sm border-r border-border/50 h-screen sticky top-0 transition-all duration-300 hidden lg:flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent />
    </aside>
  );
};
