import { useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { ChevronRight, Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const routeNames: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/analytics': 'Analytics',
  '/admin/analytics/advanced': 'Análise Avançada',
  '/admin/users': 'Gestão de Usuários',
  '/admin/dashboards': 'Painéis Públicos',
  '/admin/exports': 'Logs de Exportação',
};

interface AdminHeaderProps {
  onMenuClick: () => void;
  isMobile: boolean;
}

export const AdminHeader = ({ onMenuClick, isMobile }: AdminHeaderProps) => {
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

  // Truncate breadcrumbs on mobile
  const displayBreadcrumbs = isMobile 
    ? [breadcrumbs[breadcrumbs.length - 1]] 
    : breadcrumbs;

  return (
    <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 md:px-6 py-3 md:py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
            {displayBreadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-2 truncate">
                {index > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                <span className={cn(
                  "truncate",
                  index === displayBreadcrumbs.length - 1 ? 'text-foreground font-medium' : ''
                )}>
                  {crumb.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                {!isMobile && (
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">Administrador</p>
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
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
