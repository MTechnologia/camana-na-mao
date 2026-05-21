import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ScrollText, Users, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const items = [
  {
    to: '/admin/docs/overview',
    label: 'Documentação',
    shortLabel: 'Docs',
    Icon: BookOpen,
    match: (path: string) => path.startsWith('/admin/docs'),
  },
  { to: '/admin/users', label: 'Usuários e perfis', shortLabel: 'Usuários', Icon: Users, match: (path: string) => path === '/admin/users' },
  {
    to: '/admin/audit-logs',
    label: 'Auditoria',
    shortLabel: 'Auditoria',
    Icon: ScrollText,
    match: (path: string) => path === '/admin/audit-logs',
  },
  {
    to: '/admin/service-corrections',
    label: 'Correções',
    shortLabel: 'Correções',
    Icon: Wrench,
    match: (path: string) => path === '/admin/service-corrections',
  },
] as const;

export function GovernanceSubNav() {
  const { pathname } = useLocation();
  const path = pathname.replace(/\/+$/, '') || '/';

  return (
    <nav aria-label="Seções de administração e conformidade">
      <Card className="overflow-hidden border-border/80 p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">
          {items.map(({ to, label, shortLabel, Icon, match }) => {
            const active = match(path);
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
                <span className="lg:hidden">{shortLabel}</span>
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </div>
      </Card>
    </nav>
  );
}
