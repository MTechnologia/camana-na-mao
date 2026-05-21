import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Brain,
  Download,
  Glasses,
  Plug,
  Settings2,
  Share2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const items = [
  { to: '/admin/notifications', label: 'Notificações', shortLabel: 'Notif.', Icon: Bell, end: true },
  { to: '/admin/exports', label: 'Exportações', shortLabel: 'Export.', Icon: Download, end: true },
  {
    to: '/admin/settings/parameters',
    label: 'Parametrização',
    shortLabel: 'Parâm.',
    Icon: Settings2,
    end: true,
  },
  {
    to: '/admin/settings/referral-rules',
    label: 'Encaminhamento',
    shortLabel: 'Regras',
    Icon: Share2,
    end: true,
  },
  {
    to: '/admin/settings/integrations',
    label: 'Integrações',
    shortLabel: 'APIs',
    Icon: Plug,
    end: true,
  },
  { to: '/admin/settings/ai', label: 'IA', shortLabel: 'IA', Icon: Brain, end: true },
  {
    to: '/admin/settings/accessibility',
    label: 'Acessibilidade',
    shortLabel: 'A11y',
    Icon: Glasses,
    end: true,
  },
] as const;

function isActive(pathname: string, to: string, end: boolean) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const base = to.split('?')[0];
  if (end) return path === base;
  return path === base || path.startsWith(`${base}/`);
}

export function PlatformSubNav() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Seções de plataforma e integrações">
      <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {items.map(({ to, label, shortLabel, Icon, end }) => {
            const active = isActive(pathname, to, end);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="xl:hidden">{shortLabel}</span>
                <span className="hidden xl:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </Card>
    </nav>
  );
}
