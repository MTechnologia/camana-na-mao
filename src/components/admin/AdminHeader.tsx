import { useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { ChevronRight } from 'lucide-react';

const routeNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/analytics': 'Analytics',
  '/admin/analytics/advanced': 'Análise Avançada',
  '/admin/users': 'Gestão de Usuários',
  '/admin/dashboards': 'Painéis Públicos',
  '/admin/exports': 'Logs de Exportação',
};

export const AdminHeader = () => {
  const location = useLocation();
  const { profile } = useProfile();
  
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((_, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return {
      path,
      name: routeNames[path] || pathSegments[index],
    };
  });

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4" />}
              <span className={index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                {crumb.name}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
          <Avatar>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{profile?.full_name?.charAt(0) || 'A'}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};
