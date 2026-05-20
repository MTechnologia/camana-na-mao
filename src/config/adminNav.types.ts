import type { LucideIcon } from 'lucide-react';

export type NavPermission =
  | 'canManageUsers'
  | 'canConfigureSystem'
  | 'canViewAuditLogs'
  | 'canModerateServiceCorrections';

export type NavItem = {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Somente role admin */
  adminOnly?: boolean;
  /** Permissão RBAC adicional (além de adminOnly, quando aplicável) */
  requiresPermission?: NavPermission;
  /** Exige ao menos uma permissão (para vereador/assessor no painel admin) */
  requiredAnyPermission?: string[];
};

export type NavGroup = {
  id: string;
  label: string;
  Icon: LucideIcon;
  items: NavItem[];
};

export type NavSection = {
  title: string;
  items?: NavItem[];
  groups?: NavGroup[];
};

export function isNavSectionEmpty(section: NavSection): boolean {
  const itemCount = section.items?.length ?? 0;
  const groupCount = section.groups?.length ?? 0;
  return itemCount === 0 && groupCount === 0;
}
