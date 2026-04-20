import { Dispatch, SetStateAction, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { useGabineteVereador } from '@/hooks/useGabineteVereador';
import { Building2, ChevronLeft, ClipboardList, Home, LayoutDashboard, Send, X } from 'lucide-react';

interface VereadorSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
  isMobile: boolean;
}

const menuItems = [
  { title: 'Dashboard', href: '/gabinete', icon: LayoutDashboard },
  { title: 'Manifestações', href: '/gabinete/manifestacoes', icon: ClipboardList },
  { title: 'Encaminhamentos', href: '/gabinete/encaminhamentos', icon: Send },
];

export const VereadorSidebar = ({ mobileOpen, setMobileOpen, isMobile }: VereadorSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vereador, isVereador, isAssessor } = useGabineteVereador();
  const [collapsed, setCollapsed] = useState(false);

  const content = (
    <>
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">Gabinete</h2>
              <p className="text-xs text-muted-foreground truncate">
                {isVereador ? 'Área do vereador' : isAssessor ? 'Área do assessor' : 'Área institucional'}
              </p>
            </div>
          </div>
        )}

        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((value) => !value)}
            className="ml-auto"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        )}

        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="ml-auto">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!collapsed && (
        <div className="p-4">
          <div className="rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarImage src={vereador?.photo || undefined} />
              <AvatarFallback>{getInitials(vereador?.name || 'Gabinete')}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{vereador?.name || 'Gabinete sem vínculo'}</p>
              <div className="flex items-center gap-2">
                {vereador?.party ? <Badge variant="outline">{vereador.party}</Badge> : null}
                {vereador?.region ? (
                  <span className="text-xs text-muted-foreground truncate">{vereador.region}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="px-3 pb-3 space-y-1 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.href;

          return (
            <button
              key={item.href}
              onClick={() => {
                navigate(item.href);
                if (isMobile) setMobileOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                active ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <div className="p-1.5 rounded-md bg-muted/60">
                <Icon className="h-4 w-4" />
              </div>
              {!collapsed && <span className="text-sm">{item.title}</span>}
            </button>
          );
        })}
      </nav>

      <Separator className="my-2" />

      <div className="p-4">
        <Button
          variant="outline"
          className={cn('w-full justify-start', collapsed && 'justify-center')}
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
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'bg-card/50 backdrop-blur-sm border-r border-border/50 h-screen sticky top-0 transition-all duration-300 hidden lg:flex flex-col',
        collapsed ? 'w-16' : 'w-72',
      )}
    >
      {content}
    </aside>
  );
};
