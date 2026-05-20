import { adminNavSectionsDropdown } from '@/config/adminNav.dropdown';
import { adminNavSectionsLegacy } from '@/config/adminNav.legacy';
import {
  ENABLE_EXTENDED_OPERATION_NAV,
  ENABLE_NAV_DROPDOWN_MENUS,
} from '@/config/featureFlags';

export type {
  NavGroup,
  NavItem,
  NavPermission,
  NavSection,
} from '@/config/adminNav.types';
export { isNavSectionEmpty } from '@/config/adminNav.types';

function resolveNavSections() {
  if (!ENABLE_EXTENDED_OPERATION_NAV) {
    return adminNavSectionsLegacy;
  }
  if (ENABLE_NAV_DROPDOWN_MENUS) {
    return adminNavSectionsDropdown;
  }
  return adminNavSectionsDropdown;
}

export const adminNavSections = resolveNavSections();
