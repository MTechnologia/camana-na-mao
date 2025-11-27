import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, Users, FileBarChart, Download, ChevronLeft, Home, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
    badge: null,
  },
  {
    title: 'Analytics',
    icon: FileBarChart,
    href: '/admin/analytics',
    badge: null,
  },
  {
    title: 'Gestão de Usuários',
    icon: Users,
    href: '/admin/users',
    badge: null,
  },
  {
    title: 'Painéis Públicos',
    icon: LayoutDashboard,
    href: '/admin/dashboards',
    badge: null,
  },
  {
    title: 'Logs de Exportação',
    icon: Download,
    href: '/admin/exports',
    badge: null,
  },
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
}

export const AdminSidebar = ({ mobileOpen, setMobileOpen, isMobile }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleNavigate = (href: string) => {
    navigate(href);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

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
                CMSP Connect
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

      <nav className="p-4 space-y-1 flex-1">
        {menuItems.map((item) => (
          <button
            key={item.href}
            onClick={() => handleNavigate(item.href)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              'hover:bg-accent/80 text-muted-foreground hover:text-foreground',
              'hover:scale-[1.02] active:scale-[0.98]',
              'group'
            )}
          >
            <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
              <item.icon className="h-4 w-4 flex-shrink-0 group-hover:text-primary transition-colors" />
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
            navigate('/home');
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
