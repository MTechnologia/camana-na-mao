import { cn } from '@/lib/utils';

/** Botões de menu na barra vermelha (modo gestão com breadcrumbs). */
export const adminBarNavButtonClass = cn(
  'text-analytics-bar-foreground hover:bg-analytics-bar-surface/20 hover:text-analytics-bar-foreground',
);

/** Botões de menu na barra de recorte (mesma cor do sidebar). */
export const adminBarAnalyticsNavButtonClass = cn(
  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
);

export const adminBarSidebarActionsGroupClass = cn(
  'flex shrink-0 items-center gap-0.5 rounded-lg p-0.5',
  'bg-sidebar-accent/40 ring-1 ring-inset ring-sidebar-border',
);

export const adminBarSidebarGhostActionClass = cn(
  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
);

export const adminBarSelectTriggerClass = cn(
  'h-9 w-full rounded-lg border-0 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm',
  'ring-1 ring-black/[0.06]',
  'transition-colors hover:bg-slate-50',
  'focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-transparent',
  'data-[placeholder]:text-slate-500',
  '[&_svg]:text-slate-500',
);

export const adminBarSelectContentClass = cn(
  'rounded-xl border border-slate-200/90 bg-white p-1 shadow-xl',
  'text-slate-900',
);

export const adminBarSelectItemClass = cn(
  'rounded-md py-2 pl-8 pr-3 text-sm text-slate-800',
  'focus:bg-rose-50 focus:text-rose-950',
);

export const adminBarActionsGroupClass = cn(
  'flex shrink-0 items-center gap-0.5 rounded-lg p-0.5',
  'bg-analytics-bar-surface/10 ring-1 ring-inset ring-analytics-bar-border/40',
);

export const adminBarGhostActionClass = cn(
  'text-analytics-bar-foreground hover:bg-analytics-bar-surface/25 hover:text-analytics-bar-foreground',
);
