import type { NavGroup, NavItem, NavPermission, NavSection } from '@/config/adminNav.types';
import { isNavSectionEmpty } from '@/config/adminNav.types';
import type { UserRole } from '@/hooks/useUserRole';
import { rolesGrantPermission } from '@/lib/permissions';

export type NavPermissionMap = Partial<Record<NavPermission, boolean>>;

export type NavFilterContext = {
  isAdmin: boolean;
  isGestor: boolean;
  roles: UserRole[];
  permissions: NavPermissionMap;
};

function canSeeItem(item: NavItem, ctx: NavFilterContext): boolean {
  const { isAdmin, isGestor, roles, permissions } = ctx;
  const isInstitutionalStaff =
    isAdmin ||
    isGestor ||
    roles.some((r) => r === 'assessor' || r === 'vereador');

  if (item.adminOnly && !isAdmin) return false;
  if (item.requiresPermission && !permissions[item.requiresPermission]) {
    return false;
  }

  if (item.requiredAnyPermission?.length) {
    return item.requiredAnyPermission.some((key) => rolesGrantPermission(roles, key));
  }

  if (!isInstitutionalStaff) return false;
  return true;
}

function filterItems(items: NavItem[], ctx: NavFilterContext): NavItem[] {
  return items.filter((item) => canSeeItem(item, ctx));
}

function filterGroups(groups: NavGroup[], ctx: NavFilterContext): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterItems(group.items, ctx),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterNavSections(
  sections: NavSection[],
  isAdmin: boolean,
  permissions: NavPermissionMap = {},
  options?: { isGestor?: boolean; roles?: UserRole[] },
): NavSection[] {
  const ctx: NavFilterContext = {
    isAdmin,
    isGestor: options?.isGestor ?? false,
    roles: options?.roles ?? [],
    permissions,
  };

  return sections
    .map((section) => ({
      ...section,
      items: section.items ? filterItems(section.items, ctx) : undefined,
      groups: section.groups ? filterGroups(section.groups, ctx) : undefined,
    }))
    .filter((section) => !isNavSectionEmpty(section));
}

export function navItemMatchesPath(item: NavItem, pathname: string): boolean {
  if (item.to === '/admin') return pathname === '/admin';
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/** NavLink `end`: evita destacar o item pai quando uma sub-rota irmã está ativa. */
export function navItemRequiresExactMatch(item: NavItem, siblings: NavItem[]): boolean {
  if (item.to === '/admin') return true;
  return siblings.some(
    (other) => other.to !== item.to && other.to.startsWith(`${item.to}/`),
  );
}

export function groupMatchesPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => navItemMatchesPath(item, pathname));
}
