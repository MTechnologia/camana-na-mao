import { LayoutDashboard, Users, Download, ChevronLeft, Home, X, Building2, MessageSquare, Settings, ChevronDown, FileText, Send, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdminStats } from '@/hooks/useAdminStats';

interface MenuItem {
  title: string;
  icon: any;
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

  const menuSections: MenuSection[] = [
    {
      section: null,
      items: [{ title: 'Dashboard', icon: LayoutDashboard, href: '/admin' }],
    },
    {
      section: 'GESTÃO',
      items: [
        { title: 'Gestão de Usuários', icon: Users, href: '/admin/users' },
        { title: 'Manifestações', icon: MessageSquare, href: '/admin/reports', badge: stats.pendingReports },
        { title: 'Encaminhamentos', icon: Send, href: '/admin/referrals', badge: stats.pendingReferrals },
        { title: 'Análise de Relatos', icon: BarChart3, href: '/admin/reports-analytics' },
      ],
    },
    {
      section: 'SISTEMA',
      items: [
        {
          title: 'Configurações',
          icon: Settings,
          submenu: [
            { title: 'Integração N8N', href: '/admin/settings/n8n' },
            { title: 'Acessibilidade', href: '/admin/settings/accessibility' },
          ],
        },
        { title: 'Logs de Auditoria', icon: FileText, href: '/admin/audit-logs' },
        { title: 'Logs de Exportação', icon: Download, href: '/admin/exports' },
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

  const isActive = (href: string) => location.pathname === href;

  const SidebarContent = () => (
    <>
      <div className={cn(
        "p-4 border-b border-border/50 flex items-center justify-between",
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
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="p-4 space-y-2 flex-1">
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

      <Separator className="my-2" />

      <div className="p-4 space-y-2">
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
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
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
