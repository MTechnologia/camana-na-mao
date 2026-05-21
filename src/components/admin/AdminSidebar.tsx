import type { ReactNode } from 'react';
import { Menu, PanelLeft, PanelLeftClose, Shield } from 'lucide-react';
import { SidebarNavSection } from '@/components/admin/AdminSidebarNav';
import { adminNavSections } from '@/config/adminNav';
import { AdminShellProvider, useAdminShell } from '@/contexts/AdminShellContext';
import { useUserRole } from '@/hooks/useUserRole';
import { BackToAppButton } from '@/components/admin/BackToAppButton';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { filterNavSections } from '@/lib/adminNavFilter';
import { cn } from '@/lib/utils';

function SidebarCollapseButton({
  collapsed,
  onClick,
  className,
}: {
  collapsed: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        collapsed ? 'h-10 w-10 rounded-xl' : 'h-8 w-8',
        className,
      )}
      onClick={onClick}
      aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      aria-expanded={!collapsed}
    >
      {collapsed ? (
        <PanelLeft className="h-[1.125rem] w-[1.125rem]" aria-hidden />
      ) : (
        <PanelLeftClose className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}

export function AdminSidebar() {
  const {
    isAdmin,
    canManageUsers,
    canConfigureSystem,
    canViewAuditLogs,
    canModerateServiceCorrections,
  } = useUserRole();
  const {
    sidebarCollapsed,
    toggleSidebarCollapsed,
    mobileMenuOpen,
    closeMobileMenu,
  } = useAdminShell();

  const filtered = filterNavSections(adminNavSections, isAdmin, {
    canManageUsers,
    canConfigureSystem,
    canViewAuditLogs,
    canModerateServiceCorrections,
  });
  const collapsed = sidebarCollapsed;

  const tooltipContentClass =
    'z-[200] border-border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md';

  return (
    <TooltipProvider delayDuration={0}>
      <button
        type="button"
        className={cn(
          'fixed inset-0 z-40 bg-[hsl(var(--shell-h)_var(--shell-s)_12%)]/50 backdrop-blur-[2px] transition md:hidden',
          mobileMenuOpen ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0',
        )}
        aria-hidden={!mobileMenuOpen}
        onClick={closeMobileMenu}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl shadow-black/20',
          'transition-[width,transform] duration-200 ease-in-out',
          'md:static md:z-auto md:min-h-screen md:translate-x-0',
          mobileMenuOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full md:translate-x-0',
          collapsed ? 'md:w-[4.5rem]' : 'md:w-[280px]',
        )}
        aria-label="Menu principal"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div
          className={cn(
            'flex shrink-0 border-b border-sidebar-border',
            collapsed
              ? 'flex-col items-center gap-2 px-2 py-3'
              : 'h-14 items-center gap-3 px-4',
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground',
              collapsed ? 'h-9 w-9' : 'h-9 w-9',
            )}
          >
            <Shield className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
          </div>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <SidebarCollapseButton
                  collapsed
                  onClick={toggleSidebarCollapsed}
                  className="hidden md:inline-flex"
                />
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className={tooltipContentClass}>
                Expandir menu
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                  Câmara na Mão
                </p>
                <p className="truncate text-xs text-sidebar-foreground/70">Painel administrativo</p>
              </div>
              <SidebarCollapseButton
                collapsed={false}
                onClick={toggleSidebarCollapsed}
                className="hidden md:inline-flex"
              />
            </>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 overflow-y-auto',
            '[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-foreground/25',
            collapsed ? 'px-1.5 py-3' : 'px-2 py-3',
          )}
        >
          {filtered.map((section, sectionIndex) => (
            <SidebarNavSection
              key={section.title}
              section={section}
              collapsed={collapsed}
              sectionIndex={sectionIndex}
              onNavigate={closeMobileMenu}
            />
          ))}
        </nav>

        {!collapsed ? (
          <div className="flex shrink-0 border-t border-sidebar-border p-2 md:hidden">
            <SidebarCollapseButton
              collapsed={false}
              onClick={toggleSidebarCollapsed}
              className="w-full"
            />
          </div>
        ) : null}
      </aside>
    </TooltipProvider>
  );
}

export function AdminMobileMenuButton({ className }: { className?: string }) {
  const { openMobileMenu } = useAdminShell();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 shrink-0 md:hidden', className)}
      onClick={openMobileMenu}
      aria-label="Abrir menu"
    >
      <Menu className="h-4 w-4" />
    </Button>
  );
}

export function AdminDesktopSidebarToggle({ className }: { className?: string }) {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useAdminShell();

  if (!sidebarCollapsed) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('hidden h-8 w-8 shrink-0 md:inline-flex', className)}
      onClick={toggleSidebarCollapsed}
      aria-label="Expandir menu lateral"
      aria-expanded={false}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}

export function useAdminShellMenu() {
  return useAdminShell().openMobileMenu;
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminShellProvider>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
        <BackToAppButton />
      </div>
    </AdminShellProvider>
  );
}
