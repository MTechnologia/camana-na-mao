import type { NavGroup, NavItem, NavPermission, NavSection } from '@/config/adminNav.types';
import { isNavSectionEmpty } from '@/config/adminNav.types';

export type NavPermissionMap = Partial<Record<NavPermission, boolean>>;

function canSeeItem(
  item: NavItem,
  isAdmin: boolean,
  permissions: NavPermissionMap,
): boolean {
  if (item.adminOnly && !isAdmin) return false;
  if (item.requiresPermission && !permissions[item.requiresPermission]) {
    return false;
  }
  return true;
}

function filterItems(
  items: NavItem[],
  isAdmin: boolean,
  permissions: NavPermissionMap,
): NavItem[] {
  return items.filter((item) => canSeeItem(item, isAdmin, permissions));
}

function filterGroups(
  groups: NavGroup[],
  isAdmin: boolean,
  permissions: NavPermissionMap,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterItems(group.items, isAdmin, permissions),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterNavSections(
  sections: NavSection[],
  isAdmin: boolean,
  permissions: NavPermissionMap = {},
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        ? filterItems(section.items, isAdmin, permissions)
        : undefined,
      groups: section.groups
        ? filterGroups(section.groups, isAdmin, permissions)
        : undefined,
    }))
    .filter((section) => !isNavSectionEmpty(section));
}

export function navItemMatchesPath(item: NavItem, pathname: string): boolean {
  if (item.to === '/admin') return pathname === '/admin';
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function groupMatchesPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => navItemMatchesPath(item, pathname));
}
