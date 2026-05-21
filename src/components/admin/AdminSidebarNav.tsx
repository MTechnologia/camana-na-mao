import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { NavGroup, NavSection } from '@/config/adminNav.types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { groupMatchesPath, navItemRequiresExactMatch } from '@/lib/adminNavFilter';
import { cn } from '@/lib/utils';

const navItemBase = cn(
  'flex items-center text-sm transition-[color,background-color,box-shadow] duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
);

const collapsedIconButtonClass = cn(
  navItemBase,
  'relative mx-auto h-9 w-9 shrink-0 justify-center rounded-lg',
  'text-sidebar-foreground',
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
);

const tooltipContentClass =
  'z-[200] border-border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md';

const NavItemLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof NavLink> & { children: ReactNode }
>(function NavItemLink({ className, children, ...props }, ref) {
  return (
    <NavLink ref={ref} className={className} {...props}>
      {children}
    </NavLink>
  );
});

function NavIcon({ Icon, collapsed }: { Icon: ComponentType<{ className?: string }>; collapsed: boolean }) {
  return (
    <Icon
      className={cn('shrink-0 text-current', collapsed ? 'h-[1.125rem] w-[1.125rem]' : 'h-4 w-4')}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

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
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      navItemBase,
      collapsed
        ? cn(
            collapsedIconButtonClass,
            isActive &&
              'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-black/20',
          )
        : cn(
            'gap-2.5 rounded-lg py-2',
            nested
              ? cn(
                  'px-3 pl-9 text-[13px]',
                  isActive && 'border-l-2 border-sidebar-primary pl-[calc(2.25rem-2px)]',
                )
              : cn('px-3', isActive && 'border-l-2 border-sidebar-primary pl-[calc(0.75rem-2px)]'),
            ),
      !collapsed &&
        (isActive
          ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/88 hover:bg-sidebar-accent hover:text-sidebar-foreground'),
    );

  const link = (
    <NavItemLink to={to} end={end} onClick={onNavigate} className={linkClass}>
      <NavIcon Icon={Icon} collapsed={collapsed} />
      {collapsed ? <span className="sr-only">{label}</span> : label}
    </NavItemLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className={tooltipContentClass}>
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
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  collapsedIconButtonClass,
                  routeActive &&
                    'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-black/20',
                )}
                aria-label={group.label}
                aria-haspopup="menu"
              >
                <NavIcon Icon={group.Icon} collapsed />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className={tooltipContentClass}>
            {group.label}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="z-[200] min-w-[12rem] border-border"
        >
          <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((item) => (
            <DropdownMenuItem key={item.to} asChild>
              <NavLink
                to={item.to}
                end={navItemRequiresExactMatch(item, group.items)}
                onClick={onNavigate}
                className="cursor-pointer"
              >
                <item.Icon className="mr-2 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {item.label}
              </NavLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
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
          routeActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/90',
          open && 'bg-sidebar-accent/60',
        )}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <group.Icon className="h-4 w-4 shrink-0 text-sidebar-primary" strokeWidth={1.75} aria-hidden />
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
        aria-hidden={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div
          className={cn(
            'min-h-0 overflow-hidden transition-opacity duration-200',
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ul
            className={cn(
              'space-y-0.5 px-1',
              open ? 'border-t border-sidebar-border/50 py-1.5' : 'py-0',
            )}
          >
            {group.items.map((item) => (
              <li key={item.to}>
                <SidebarNavItem
                  to={item.to}
                  end={navItemRequiresExactMatch(item, group.items)}
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
          className="mx-auto my-2.5 h-px w-8 bg-sidebar-border/80"
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
            collapsed ? 'flex flex-col items-center gap-1' : 'space-y-0.5',
            groups.length > 0 && !collapsed && 'mb-2.5',
          )}
        >
          {items.map((item) => (
            <li key={item.to} className={cn(collapsed && 'w-full')}>
              <SidebarNavItem
                to={item.to}
                end={navItemRequiresExactMatch(item, items)}
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
        <ul className={cn(collapsed ? 'flex flex-col items-center gap-1' : 'space-y-2')}>
          {groups.map((group) => (
            <li key={group.id} className={cn(collapsed && 'w-full')}>
              <SidebarNavGroup group={group} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
