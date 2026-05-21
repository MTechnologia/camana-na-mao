import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FileText, Share2 } from 'lucide-react';

const items = [
  { to: '/admin/reports', label: 'Gestão de relatos', shortLabel: 'Gestão', Icon: FileText, end: true },
  {
    to: '/admin/referrals',
    label: 'Análise de encaminhamentos',
    shortLabel: 'Encam.',
    Icon: Share2,
    end: false,
  },
] as const;

function isActive(pathname: string, to: string, end: boolean) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (end) return path === to;
  return path === to || path.startsWith(`${to}/`);
}

export function UrbanReportsSubNav() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Seções de relatos urbanos">
      <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          {items.map(({ to, label, shortLabel, Icon, end }) => {
            const active = isActive(pathname, to, end);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors sm:text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </Card>
    </nav>
  );
}
