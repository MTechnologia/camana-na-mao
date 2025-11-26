import { NavLink } from '@/components/NavLink';
import { LayoutDashboard, Users, FileBarChart, Download, Settings, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    title: 'Analytics',
    icon: FileBarChart,
    href: '/admin/analytics',
  },
  {
    title: 'Gestão de Usuários',
    icon: Users,
    href: '/admin/users',
  },
  {
    title: 'Painéis Públicos',
    icon: LayoutDashboard,
    href: '/admin/dashboards',
  },
  {
    title: 'Logs de Exportação',
    icon: Download,
    href: '/admin/exports',
  },
];

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'bg-card border-r border-border h-screen sticky top-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground">
            Área Admin
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
            activeClassName="bg-primary/10 text-primary font-medium"
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-4 left-0 right-0 px-4">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => navigate('/home')}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {!collapsed && 'Voltar ao App'}
        </Button>
      </div>
    </aside>
  );
};
