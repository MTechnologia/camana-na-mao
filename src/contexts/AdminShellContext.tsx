import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'admin-sidebar-collapsed';

type AdminShellContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (value: boolean) => void;
  mobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

function readCollapsedPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(readCollapsedPreference);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setSidebarCollapsedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebarCollapsed,
      setSidebarCollapsed,
      mobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
    }),
    [
      sidebarCollapsed,
      toggleSidebarCollapsed,
      setSidebarCollapsed,
      mobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
    ],
  );

  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShell() {
  const ctx = useContext(AdminShellContext);
  if (!ctx) {
    throw new Error('useAdminShell must be used within AdminShellProvider');
  }
  return ctx;
}
