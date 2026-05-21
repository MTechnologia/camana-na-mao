import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, LayoutDashboard, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  {
    to: '/admin',
    title: 'Visão executiva',
    description: 'Indicadores oficiais e território no recorte global.',
    Icon: LayoutDashboard,
  },
  {
    to: '/admin/analytics',
    title: 'Análise de relatos urbanos',
    description: 'Abas temáticas com volume, sentimento e padrões.',
    Icon: BarChart3,
  },
  {
    to: '/admin/reports-heatmap',
    title: 'Mapa de calor',
    description: 'Métricas territoriais em mapa interativo.',
    Icon: Map,
  },
] as const;

export function PaineisExploreLinks() {
  return (
    <section aria-label="Análise institucional relacionada" className="border-t border-border pt-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Análise institucional
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map(({ to, title, description, Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              'group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm',
              'transition-all hover:border-primary/25 hover:shadow-md',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                {title}
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
