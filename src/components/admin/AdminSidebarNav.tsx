import { useEffect, useId, useState, type ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { NavGroup, NavSection } from '@/config/adminNav.types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { groupMatchesPath } from '@/lib/adminNavFilter';
import { cn } from '@/lib/utils';

const navItemBase = cn(
  'flex items-center text-sm transition-[color,background-color,box-shadow] duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
);

export function SidebarNavItem({
  to,
  end,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
  nested,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: ComponentType<{ className?: string }>;
  collapsed: boolean;
  onNavigate: () => void;
  nested?: boolean;
}) {
  const link = (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          navItemBase,
          collapsed
            ? 'relative mx-auto h-10 w-10 justify-center rounded-xl'
            : cn(
                'gap-2.5 rounded-lg py-2',
                nested
                  ? cn('px-3 pl-9 text-[13px]', isActive && 'border-l-2 border-sidebar-primary pl-[calc(2.25rem-2px)]')
                  : cn('px-3', isActive && 'border-l-2 border-sidebar-primary pl-[calc(0.75rem-2px)]'),
              ),
          isActive
            ? collapsed
              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/15'
              : 'bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-sm'
            : collapsed
              ? 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              : 'text-sidebar-foreground/88 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        )
      }
    >
      <Icon
        className={cn(
          'shrink-0',
          collapsed ? 'h-[1.125rem] w-[1.125rem]' : 'h-4 w-4',
          'opacity-95',
        )}
        aria-hidden
      />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="border-sidebar-border/30 bg-highlight px-2.5 py-1.5 text-xs font-medium text-primary shadow-md"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarNavGroup({
  group,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const { pathname } = useLocation();
  const routeActive = groupMatchesPath(group, pathname);
  const [open, setOpen] = useState(routeActive);
  const panelId = useId();

  useEffect(() => {
    if (routeActive) setOpen(true);
  }, [routeActive, pathname]);

  if (collapsed) {
    return (
      <ul className="space-y-1">
        {group.items.map((item) => (
          <li key={item.to} className="relative">
            <SidebarNavItem
              to={item.to}
              end={item.to === '/admin'}
              label={item.label}
              icon={group.Icon}
              collapsed
              onNavigate={onNavigate}
            />
            {routeActive && (
              <span
                className="pointer-events-none absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sidebar-primary"
                aria-hidden
              />
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-sidebar-surface/80 shadow-sm shadow-black/5">
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
          'hover:bg-sidebar-accent',
          routeActive
            ? 'text-sidebar-foreground'
            : 'text-sidebar-foreground/90',
          open && 'bg-sidebar-accent/60',
        )}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <group.Icon className="h-4 w-4 shrink-0 text-sidebar-primary opacity-95" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{group.label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-sidebar-muted transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <ul className="min-h-0 overflow-hidden space-y-0.5 border-t border-sidebar-border/50 px-1 py-1.5">
          {group.items.map((item) => (
            <li key={item.to}>
              <SidebarNavItem
                to={item.to}
                end={item.to === '/admin'}
                label={item.label}
                icon={item.Icon}
                collapsed={false}
                onNavigate={onNavigate}
                nested
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SidebarNavSection({
  section,
  collapsed,
  sectionIndex,
  onNavigate,
}: {
  section: NavSection;
  collapsed: boolean;
  sectionIndex: number;
  onNavigate: () => void;
}) {
  const items = section.items ?? [];
  const groups = section.groups ?? [];

  return (
    <section
      className={cn(collapsed ? 'pb-1' : 'mb-5 last:mb-2')}
      aria-label={section.title}
    >
      {collapsed && sectionIndex > 0 && (
        <div
          className="mx-auto my-3 h-px w-9 bg-sidebar-border/80"
          role="separator"
          aria-hidden
        />
      )}
      {!collapsed && (
        <div className="mb-2.5 flex items-center gap-2 px-3">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
            {section.title}
          </p>
          <div className="h-px min-w-0 flex-1 bg-sidebar-border/60" aria-hidden />
        </div>
      )}

      {items.length > 0 ? (
        <ul
          className={cn(
            collapsed ? 'space-y-1' : 'space-y-0.5',
            groups.length > 0 && !collapsed && 'mb-2.5',
          )}
        >
          {items.map((item) => (
            <li key={item.to}>
              <SidebarNavItem
                to={item.to}
                end={item.to === '/admin'}
                label={item.label}
                icon={item.Icon}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {groups.length > 0 ? (
        <ul className={cn(collapsed ? 'space-y-1' : 'space-y-2')}>
          {groups.map((group) => (
            <li key={group.id}>
              <SidebarNavGroup group={group} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
