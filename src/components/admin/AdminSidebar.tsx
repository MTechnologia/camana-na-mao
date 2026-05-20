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
    isGestor,
    roles,
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

  const filtered = filterNavSections(
    adminNavSections,
    isAdmin,
    {
      canManageUsers,
      canConfigureSystem,
      canViewAuditLogs,
      canModerateServiceCorrections,
    },
    { isGestor, roles },
  );
  const collapsed = sidebarCollapsed;

  return (
    <>
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
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl shadow-black/20',
          'transition-[width,transform] duration-200 ease-in-out',
          'md:static md:z-auto md:min-h-screen md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          collapsed ? 'md:w-20' : 'md:w-[280px]',
        )}
        aria-label="Menu principal"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-sidebar-border',
            collapsed ? 'h-14 justify-center px-2' : 'h-14 gap-3 px-4',
          )}
        >
          <div
            className={cn(
              'flex shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground',
              collapsed ? 'h-10 w-10' : 'h-9 w-9 rounded-lg',
            )}
          >
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          {!collapsed && (
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
            'flex-1 overflow-y-auto overflow-x-hidden',
            '[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-foreground/25',
            collapsed ? 'px-2 py-3' : 'px-2 py-3',
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

        {collapsed ? (
          <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-2 md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarCollapseButton
                  collapsed
                  onClick={toggleSidebarCollapsed}
                  className="mx-auto flex md:inline-flex"
                />
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="border-sidebar-primary/20 bg-highlight px-2.5 py-1.5 text-xs font-medium text-primary"
              >
                Expandir menu
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex shrink-0 border-t border-sidebar-border p-2 md:hidden">
            <SidebarCollapseButton
              collapsed={false}
              onClick={toggleSidebarCollapsed}
              className="w-full"
            />
          </div>
        )}
      </aside>
    </>
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
